import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// Ensure no caching of auth check
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ADMIN_USER_ID = process.env.ADMIN_USER_ID
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'me@eddowding.com'

function isAdmin(user: { id: string; email?: string | null } | null): boolean {
  if (!user) return false
  if (ADMIN_USER_ID) return user.id === ADMIN_USER_ID
  return user.email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    return NextResponse.json({
      isAdmin: isAdmin(user),
      user: { id: user.id, email: user.email }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
