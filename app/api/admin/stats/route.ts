import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'

// Ensure this route is always dynamic and never statically cached
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ADMIN_USER_ID = process.env.ADMIN_USER_ID
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'me@eddowding.com'

async function verifyAdmin(request: NextRequest) {
  const supabase = createServerSupabase()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return false
    }

    if (ADMIN_USER_ID) {
      return user.id === ADMIN_USER_ID
    }
    return user.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabase()

  try {
    // Helper to run a query and swallow errors, logging them for diagnostics
    const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn()
      } catch (e: any) {
        console.error(`[admin/stats] ${label} failed (throw):`, e?.message || e)
        return null
      }
    }

    // Get all authenticated users from auth.users via admin API
    const registeredUsers = await safe('registeredUsers', async () => {
      const { data, error } = await (supabase as any).auth.admin.listUsers()
      if (error) {
        console.error('[admin/stats] registeredUsers query error:', error)
        return []
      }
      return data?.users || []
    })

    // Get vote counts for each user
    const userVoteCounts = await safe('userVoteCounts', async () => {
      const voteCounts: Record<string, number> = {}
      if (registeredUsers) {
        for (const user of registeredUsers as any[]) {
          if (user.id) {
            const { count, error } = await supabase
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
            if (!error && count) {
              voteCounts[user.id] = count
            }
          }
        }
      }
      return voteCounts
    })

    // Enrich users with vote counts
    const enrichedUsers = (registeredUsers as any[] || []).map(user => ({
      id: user.id,
      email: user.email,
      email_verified: user.email_confirmed_at != null,
      created_at: user.created_at,
      last_seen: user.last_sign_in_at,
      votes_count: userVoteCounts?.[user.id] || 0
    }))

    // Get total votes count
    const totalVotes = await safe('totalVotes', async () => {
      const { count, error } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
      if (error) {
        console.error('[admin/stats] totalVotes query error:', error)
        return 0
      }
      return count || 0
    })

    // All votes are now authenticated
    const authorizedVotes = totalVotes

    // Get per-document performance by aggregating across ALL elements
    const elementRows = await safe('elementsWithDocs', async () => {
      const { data, error } = await supabase
        .from('elements')
        .select(`
          id,
          document_id,
          total_vote_count,
          vote_score,
          documents!inner(title, id)
        `)
      if (error) {
        console.error('[admin/stats] elements query error:', error)
        return []
      }
      return data || []
    })

    // Aggregate by document using all elements fetched
    const documentStats = new Map<string, {
      id: string
      title: string
      totalVotes: number
      totalScore: number
      elementCount: number
    }>()

    ;(elementRows as any[] | null)?.forEach((element: any) => {
      const docId: string = element.document_id
      if (!documentStats.has(docId)) {
        documentStats.set(docId, {
          id: docId,
          title: element?.documents?.title ?? 'Untitled',
          totalVotes: 0,
          totalScore: 0,
          elementCount: 0,
        })
      }
      const doc = documentStats.get(docId)!
      doc.totalVotes += element.total_vote_count || 0
      doc.totalScore += element.vote_score || 0
      doc.elementCount += 1
    })

    const bestPerformingDocs = Array.from(documentStats.values())
      .map(doc => ({
        ...doc,
        averageScore: doc.elementCount > 0 ? doc.totalScore / doc.elementCount : 0,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5)

    // Fetch all documents and enrich with owner (email from auth.users)
    const documents = await safe('documents', async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, created_at, updated_at, author_id')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[admin/stats] documents query error:', error)
        return []
      }
      return data || []
    })

    const authorIds = Array.from(new Set(((documents as any[]) || [])
      .map(d => d.author_id)
      .filter((id): id is string => !!id)))

    let ownerProfiles: Record<string, { username: string | null; full_name: string | null }> = {}
    let ownerEmails: Record<string, string | null> = {}
    if (authorIds.length > 0) {
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('user_profiles')
        .select('id, username, full_name')
        .in('id', authorIds)

      if (profilesError) {
        console.error('[admin/stats] user_profiles query error:', profilesError)
      }

      ownerProfiles = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = { username: p.username ?? null, full_name: p.full_name ?? null }
        return acc
      }, {})

      // Fetch emails for owners via user_emails view or admin API
      let usersRows: any[] | null = null

      // Try public view first: public.user_emails (id, email)
      const { data: viaView, error: viewErr } = await (supabase as any)
        .from('user_emails')
        .select('id, email')
        .in('id', authorIds)

      if (!viewErr) {
        usersRows = viaView || []
      } else {
        console.info('[admin/stats] user_emails view not available; using admin API fallback')
      }

      // Fallback for missing ids: use Admin API getUserById
      const foundIds = new Set((usersRows || []).map((r: any) => r.id))
      const stillMissing = authorIds.filter((id) => !foundIds.has(id))
      if (stillMissing.length > 0) {
        for (const id of stillMissing) {
          try {
            const { data, error } = await (supabase as any).auth.admin.getUserById(id)
            if (!error && data?.user) {
              usersRows = [...(usersRows || []), { id: data.user.id, email: data.user.email }]
            } else if (error) {
              console.warn('[admin/stats] admin.getUserById failed for', id, error)
            }
          } catch (e) {
            console.warn('[admin/stats] admin.getUserById threw for', id, (e as any)?.message || e)
          }
        }
      }

      ownerEmails = (usersRows || []).reduce((acc: any, u: any) => {
        acc[u.id] = u.email ?? null
        return acc
      }, {})
    }

    const allDocuments = ((documents as any[]) || []).map(d => ({
      id: d.id,
      title: d.title,
      created_at: d.created_at,
      updated_at: d.updated_at,
      author_id: d.author_id,
      owner_username: d.author_id ? ownerProfiles[d.author_id]?.username ?? null : null,
      owner_full_name: d.author_id ? ownerProfiles[d.author_id]?.full_name ?? null : null,
      owner_email: d.author_id ? ownerEmails[d.author_id] ?? null : null,
      elements_count: documentStats.get(d.id)?.elementCount ?? 0,
      votes_total: documentStats.get(d.id)?.totalVotes ?? 0,
    }))

    return NextResponse.json({
      totalRegistered: (registeredUsers as any[] | null)?.length || 0,
      users: enrichedUsers || [],
      totalVotes: (totalVotes as number | null) || 0,
      votesByStatus: {
        authorized: (authorizedVotes as number | null) || 0,
        unauthorized: 0, // No more anonymous votes
        anonymous: 0 // No more anonymous votes
      },
      bestPerformingDocuments: bestPerformingDocs,
      allDocuments
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
