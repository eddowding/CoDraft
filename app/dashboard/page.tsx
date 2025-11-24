'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatRelativeTime } from '@/lib/utils'
import { FileText, Plus, Users, TrendingUp, Trash2, CheckSquare, Square, Search, Filter, MessageCircle, ThumbsUp } from 'lucide-react'
import type { Database } from '@/lib/database.types'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

type Document = Database['public']['Tables']['documents']['Row']

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'archived'>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'votes' | 'title'>('date')
  const [stats, setStats] = useState({
    totalVotes: 0,
    totalUniqueVoters: 0,
    totalComments: 0
  })
  const [documentStats, setDocumentStats] = useState<Record<string, { votes: number; comments: number; voters: number }>>({})
  const supabase = createClientSupabase()

  useEffect(() => {
    fetchDocuments()
    fetchStats()
  }, [])

  const fetchDocuments = async () => {
    try {
      // Only show the current user's documents on the dashboard
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id

      if (!userId) {
        // Not signed in – take them to auth page
        setLoading(false)
        return router.push('/auth')
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('author_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const docs = data || []
      setDocuments(docs)

      // Fetch stats for each document
      if (docs.length > 0) {
        await fetchDocumentStats(docs.map(d => d.id))
      }
    } catch (error) {
      logger.error('Error fetching documents', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      if (!userId) return

      // Get total votes across all user's documents
      const { data: userDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('author_id', userId)

      if (!userDocs || userDocs.length === 0) return

      const docIds = userDocs.map(d => d.id)

      // Get elements for all documents
      const { data: elements } = await supabase
        .from('elements')
        .select('vote_score, upvote_count, downvote_count')
        .in('document_id', docIds)

      const totalVotes = elements?.reduce((sum, el) =>
        sum + (el.upvote_count || 0) + (el.downvote_count || 0), 0) || 0

      // Get unique voters (authenticated only now)
      const { data: votes } = await supabase
        .from('votes')
        .select('user_id')
        .in('element_id', (await supabase
          .from('elements')
          .select('id')
          .in('document_id', docIds)
          .then(res => res.data?.map(e => e.id) || [])))

      const uniqueVoters = new Set()
      votes?.forEach(vote => {
        if (vote.user_id) uniqueVoters.add(vote.user_id)
      })

      setStats({
        totalVotes,
        totalUniqueVoters: uniqueVoters.size,
        totalComments: 0 // Will implement when comments table exists
      })
    } catch (error) {
      logger.error('Error fetching stats', error)
    }
  }

  const fetchDocumentStats = async (documentIds: string[]) => {
    try {
      if (documentIds.length === 0) return

      const statsMap: Record<string, { votes: number; comments: number; voters: number }> = {}

      // Batch query 1: Get all elements for all documents at once
      const { data: elements } = await supabase
        .from('elements')
        .select('id, document_id, vote_score, upvote_count, downvote_count')
        .in('document_id', documentIds)

      // Group elements by document
      const elementsList = elements || []
      const elementsByDoc = elementsList.reduce((acc, el) => {
        if (!acc[el.document_id]) acc[el.document_id] = []
        acc[el.document_id].push(el)
        return acc
      }, {} as Record<string, typeof elementsList>)

      // Calculate vote counts per document
      documentIds.forEach(docId => {
        const docElements = elementsByDoc[docId] || []
        statsMap[docId] = {
          votes: docElements.reduce((sum, el) =>
            sum + (el.upvote_count || 0) + (el.downvote_count || 0), 0),
          comments: 0,
          voters: 0 // Will be filled below
        }
      })

      // Batch query 2: Get all votes for all elements at once
      const allElementIds = (elements || []).map(e => e.id)
      if (allElementIds.length > 0) {
        const { data: votes } = await supabase
          .from('votes')
          .select('element_id, user_id')
          .in('element_id', allElementIds)

        // Group votes by document
        const votesByDoc: Record<string, typeof votes> = {}
        votes?.forEach(vote => {
          const element = elements?.find(el => el.id === vote.element_id)
          if (element) {
            const docId = element.document_id
            if (!votesByDoc[docId]) votesByDoc[docId] = []
            votesByDoc[docId].push(vote)
          }
        })

        // Count unique voters per document (authenticated users only)
        documentIds.forEach(docId => {
          const docVotes = votesByDoc[docId] || []
          const voterSet = new Set()
          docVotes.forEach(vote => {
            if (vote.user_id) voterSet.add(vote.user_id)
          })
          statsMap[docId].voters = voterSet.size
        })
      }

      setDocumentStats(statsMap)
    } catch (error) {
      logger.error('Error fetching document stats', error)
    }
  }

  const toggleDocumentSelection = (documentId: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId)
    } else {
      newSelected.add(documentId)
    }
    setSelectedDocuments(newSelected)
  }

  const selectAllDocuments = () => {
    const allDocumentIds = documents.map(doc => doc.id)
    setSelectedDocuments(new Set(allDocumentIds))
  }

  const clearSelection = () => {
    setSelectedDocuments(new Set())
  }

  const bulkDeleteDocuments = async () => {
    if (selectedDocuments.size === 0) return

    const documentTitles = documents
      .filter(doc => selectedDocuments.has(doc.id))
      .map(doc => doc.title)
      .join(', ')

    const confirmMessage = `Are you sure you want to delete ${selectedDocuments.size} document(s)?\n\nDocuments: ${documentTitles}\n\nThis action cannot be undone and will also delete all votes and comments.`

    if (!window.confirm(confirmMessage)) return

    setIsDeleting(true)

    try {
      // Delete documents in parallel
      const deletePromises = Array.from(selectedDocuments).map(async (documentId) => {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Failed to delete document ${documentId}: ${error.error}`)
        }

        return response.json()
      })

      await Promise.all(deletePromises)

      // Remove deleted documents from state
      setDocuments(prevDocs =>
        prevDocs.filter(doc => !selectedDocuments.has(doc.id))
      )

      // Clear selection
      setSelectedDocuments(new Set())

      toast({
        title: 'Documents deleted',
        description: `Successfully deleted ${selectedDocuments.size} document(s)`,
        variant: 'success',
      })
    } catch (error) {
      logger.error('Error during bulk delete', error)
      toast({
        title: 'Error deleting documents',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here are your recent documents.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {documents.filter(d => d.is_public).length} public
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Votes
              </CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVotes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Voters
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUniqueVoters}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Engaged participants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Comments
              </CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Coming soon
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={visibilityFilter} onValueChange={(value: any) => setVisibilityFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="votes">Votes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {documents.length > 0 && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedDocuments.size === documents.length ? clearSelection : selectAllDocuments}
                >
                  {selectedDocuments.size === documents.length ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                {selectedDocuments.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedDocuments.size} document(s) selected
                  </span>
                )}
              </div>
              {selectedDocuments.size > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={bulkDeleteDocuments}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : `Delete ${selectedDocuments.size}`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>
              Your recently created and edited documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first document.
                </p>
                <Button asChild>
                  <Link href="/documents/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {documents
                  .filter((doc) => {
                    // Apply search filter
                    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                      return false
                    }
                    // Apply status filter
                    if (statusFilter !== 'all' && doc.status !== statusFilter) {
                      return false
                    }
                    // Apply visibility filter
                    if (visibilityFilter === 'public' && !doc.is_public) {
                      return false
                    }
                    if (visibilityFilter === 'private' && doc.is_public) {
                      return false
                    }
                    return true
                  })
                  .sort((a, b) => {
                    if (sortBy === 'title') {
                      return a.title.localeCompare(b.title)
                    }
                    if (sortBy === 'votes') {
                      const aVotes = documentStats[a.id]?.votes || 0
                      const bVotes = documentStats[b.id]?.votes || 0
                      return bVotes - aVotes
                    }
                    // Default to date
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                  })
                  .map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                      selectedDocuments.has(doc.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleDocumentSelection(doc.id)}
                        className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-colors ${
                          selectedDocuments.has(doc.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {selectedDocuments.has(doc.id) ? (
                          <CheckSquare className="w-3 h-3" />
                        ) : (
                          <Square className="w-3 h-3 opacity-0" />
                        )}
                      </button>
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-medium hover:underline"
                        >
                          {doc.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(doc.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* Performance Metrics */}
                      {documentStats[doc.id] && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-muted-foreground" />
                            <span>{documentStats[doc.id].votes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span>{documentStats[doc.id].voters || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-muted-foreground" />
                            <span>{documentStats[doc.id].comments || 0}</span>
                          </div>
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.is_public
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
