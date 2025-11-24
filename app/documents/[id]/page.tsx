'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { MarkdownEditor } from '@/components/editor/markdown-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Save, ArrowLeft, Clock, Globe, Lock, Copy, Unlock, Trash2, MoreVertical, Eye, BarChart3, Users, ThumbsUp, ThumbsDown, TrendingUp, Sparkles, Link, Check, AlertCircle } from 'lucide-react'
import type { Database } from '@/lib/database.types'
import { useToast } from '@/hooks/use-toast'

type Document = Database['public']['Tables']['documents']['Row']
type Element = Database['public']['Tables']['elements']['Row']

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const documentId = params?.id as string
  const isNewDocument = documentId === 'new'

  const [document, setDocument] = useState<Document | null>(null)
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(!isNewDocument)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [isAiTidying, setIsAiTidying] = useState(false)
  const [analytics, setAnalytics] = useState({
    totalVotes: 0,
    upvotes: 0,
    downvotes: 0,
    uniqueVoters: 0,
    authVoters: 0,
    anonVoters: 0,
    topElements: [] as { id: string; content: string; score: number }[]
  })

  // For new documents
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(isNewDocument ? null : documentId)
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugCopied, setSlugCopied] = useState(false)

  // Auto-save timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClientSupabase()

  useEffect(() => {
    if (!isNewDocument && documentId) {
      fetchDocument()
      fetchElements()
    } else if (isNewDocument) {
      // Initialize new document
      setTitle('Untitled Document')
      setContent('# Untitled Document\n\nStart writing...')
      setLoading(false)
    }
  }, [documentId, isNewDocument])

  const fetchDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) throw error
      setDocument(data)
      setTitle(data.title)
      setContent(data.content)
      setCurrentDocumentId(data.id)
      setSlug(data.slug || '')
    } catch (error) {
      console.error('Error fetching document:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchElements = async () => {
    if (!currentDocumentId) return

    try {
      const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('document_id', currentDocumentId)
        .order('order_index')

      if (error) throw error
      setElements(data || [])

      // Fetch analytics when elements are loaded
      if (data && data.length > 0) {
        fetchAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching elements:', error)
    }
  }

  const fetchAnalytics = async (elementsData: Element[]) => {
    if (!currentDocumentId) return

    try {
      // Calculate vote totals from elements
      const totalUpvotes = elementsData.reduce((sum, el) => sum + (el.upvote_count || 0), 0)
      const totalDownvotes = elementsData.reduce((sum, el) => sum + (el.downvote_count || 0), 0)

      // Get top voted elements
      const topElements = elementsData
        .filter(el => el.vote_score !== 0)
        .sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0))
        .slice(0, 5)
        .map(el => ({
          id: el.id,
          content: el.content.substring(0, 100),
          score: el.vote_score || 0
        }))

      // Get unique voters (authenticated only)
      const elementIds = elementsData.map(e => e.id)
      const { data: votes } = await supabase
        .from('votes')
        .select('user_id')
        .in('element_id', elementIds)

      const uniqueVoterSet = new Set()
      votes?.forEach(vote => {
        if (vote.user_id) {
          uniqueVoterSet.add(vote.user_id)
        }
      })

      setAnalytics({
        totalVotes: totalUpvotes + totalDownvotes,
        upvotes: totalUpvotes,
        downvotes: totalDownvotes,
        uniqueVoters: uniqueVoterSet.size,
        authVoters: uniqueVoterSet.size,
        anonVoters: 0,
        topElements
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }


  const createDocument = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push('/auth')
        return null
      }

      const { data: newDoc, error } = await supabase
        .from('documents')
        .insert({
          title,
          content,
          author_id: user.user.id,
          is_public: false,
          is_collaborative: false,
          status: 'published',
          word_count: content.split(/\s+/).length,
          estimated_read_time: Math.ceil(content.split(/\s+/).length / 200),
        })
        .select()
        .single()

      if (error) throw error

      setDocument(newDoc)
      setCurrentDocumentId(newDoc.id)

      // Update URL to reflect the new document ID
      window.history.replaceState({}, '', `/documents/${newDoc.id}`)

      return newDoc.id
    } catch (error) {
      console.error('Error creating document:', error)
      return null
    }
  }

  const saveDocument = async (newContent?: string, newTitle?: string) => {
    const contentToSave = newContent !== undefined ? newContent : content
    const titleToSave = newTitle !== undefined ? newTitle : title

    setSaving(true)
    setLastSaved(null)

    try {
      let docId = currentDocumentId

      // If it's a new document, create it first
      if (!docId) {
        docId = await createDocument()
        if (!docId) {
          setSaving(false)
          return
        }
      }

      // Update existing document
      const { error } = await supabase
        .from('documents')
        .update({
          content: contentToSave,
          title: titleToSave,
          word_count: contentToSave.split(/\s+/).length,
          estimated_read_time: Math.ceil(contentToSave.split(/\s+/).length / 200),
        })
        .eq('id', docId)

      if (error) throw error

      // Parse content and create/update elements
      await parseContentToElements(contentToSave, docId)

      setLastSaved(new Date())
    } catch (error) {
      console.error('Error saving document:', error)
    } finally {
      setSaving(false)
    }
  }

  const parseContentToElements = async (contentToParse: string, docId: string) => {
    const lines = contentToParse.split('\n')
    const newElements: Omit<Element, 'id' | 'created_at' | 'updated_at'>[] = []
    let orderIndex = 0

    for (const line of lines) {
      if (line.trim()) {
        let type = 'paragraph'

        if (line.startsWith('#')) {
          type = 'heading'
        } else if (line.startsWith('```')) {
          type = 'code'
        } else if (line.startsWith('> ')) {
          type = 'quote'
        } else if (line.match(/^(\s*[-*]\s+)/)) {
          // Detect list items - keep original indentation in content for nesting info
          type = 'list'
        }

        newElements.push({
          document_id: docId,
          content: line, // Keep original content with indentation
          type: type, // Keep type as simple 'list' to satisfy constraint
          order_index: orderIndex++,
          upvote_count: 0,
          downvote_count: 0,
          total_vote_count: 0,
          vote_score: 0,
          auth_upvote_count: 0,
          auth_downvote_count: 0,
          last_vote_sync: new Date().toISOString(),
          version: 1,
          locked_by: null,
          locked_at: null,
        })
      }
    }

    // Delete existing elements and insert new ones
    await supabase.from('elements').delete().eq('document_id', docId)

    if (newElements.length > 0) {
      const { error } = await supabase.from('elements').insert(newElements)
      if (error) throw error
    }

    fetchElements()
  }


  // Auto-save functionality with debouncing
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)

    if (!autoSaveEnabled) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save (2 seconds after typing stops)
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument(newContent, title)
    }, 2000)
  }, [title, autoSaveEnabled])

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle)

    if (!autoSaveEnabled) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument(content, newTitle)
    }, 2000)
  }, [content, autoSaveEnabled])

  const togglePublicStatus = async () => {
    if (!currentDocumentId || !document) return

    try {
      const newPublicStatus = !document.is_public
      // If making private, also disable login_not_required
      const updates: any = { is_public: newPublicStatus }
      if (!newPublicStatus) {
        updates.login_not_required = false
      }

      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', currentDocumentId)

      if (error) throw error

      setDocument({
        ...document,
        is_public: newPublicStatus,
        login_not_required: newPublicStatus ? document.login_not_required : false
      })
    } catch (error) {
      console.error('Error toggling public status:', error)
    }
  }

  const toggleLoginRequired = async () => {
    if (!currentDocumentId || !document || !document.is_public) return

    try {
      const newLoginRequired = !document.login_not_required
      const { error } = await supabase
        .from('documents')
        .update({ login_not_required: newLoginRequired })
        .eq('id', currentDocumentId)

      if (error) throw error

      setDocument({ ...document, login_not_required: newLoginRequired })
    } catch (error) {
      console.error('Error toggling login requirement:', error)
    }
  }

  const copyPublicLink = async () => {
    if (!currentDocumentId) return

    // Use slug if available, otherwise use the document ID
    const docIdentifier = slug || currentDocumentId
    const publicLink = `${window.location.origin}/public/${docIdentifier}`
    await navigator.clipboard.writeText(publicLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const validateSlug = (value: string): string | null => {
    if (!value) return null // Empty is valid (will use UUID)
    if (value.length < 3) return 'Slug must be at least 3 characters'
    if (value.length > 100) return 'Slug must be less than 100 characters'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      return 'Slug can only contain lowercase letters, numbers, and hyphens'
    }
    return null
  }

  const handleSlugChange = (value: string) => {
    // Convert to lowercase and replace spaces with hyphens
    const normalized = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setSlug(normalized)
    setSlugError(validateSlug(normalized))
  }

  const copySlugUrl = async () => {
    const docIdentifier = slug || currentDocumentId
    const publicLink = `${window.location.origin}/public/${docIdentifier}`
    await navigator.clipboard.writeText(publicLink)
    setSlugCopied(true)
    setTimeout(() => setSlugCopied(false), 2000)
  }

  const saveSlug = async () => {
    if (!currentDocumentId) return

    const error = validateSlug(slug)
    if (error) {
      setSlugError(error)
      return
    }

    setSlugSaving(true)
    setSlugError(null)

    try {
      // Check if slug is already taken (if not empty)
      if (slug) {
        const { data: existing } = await supabase
          .from('documents')
          .select('id')
          .eq('slug', slug)
          .neq('id', currentDocumentId)
          .single()

        if (existing) {
          setSlugError('This slug is already taken')
          setSlugSaving(false)
          return
        }
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update({ slug: slug || null })
        .eq('id', currentDocumentId)

      if (updateError) throw updateError

      setDocument(prev => prev ? { ...prev, slug: slug || null } : null)

      // Copy the new URL to clipboard
      if (slug) {
        const publicLink = `${window.location.origin}/public/${slug}`
        await navigator.clipboard.writeText(publicLink)
        setSlugCopied(true)
        setTimeout(() => setSlugCopied(false), 2000)
      }

      toast({
        title: slug ? 'Custom URL saved & copied' : 'Custom URL removed',
        description: slug ? `${window.location.origin}/public/${slug}` : 'Using default URL',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error saving slug:', error)
      toast({
        title: 'Error',
        description: 'Failed to save custom URL',
        variant: 'destructive',
      })
    } finally {
      setSlugSaving(false)
    }
  }

  const handleAiTidyContent = async () => {
    if (!content.trim()) return

    setIsAiTidying(true)
    try {
      const response = await fetch('/api/ai-tidy-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to tidy content with AI')
      }

      const { tidiedContent, generatedTitle } = await response.json()
      setContent(tidiedContent)

      // Update the title if we have a generated title
      if (generatedTitle) {
        setTitle(generatedTitle)
      }

      // Save the tidied content
      await saveDocument(tidiedContent, generatedTitle || title)
    } catch (error) {
      console.error('Error tidying content with AI:', error)
      toast({
        title: 'AI Tidy Unavailable',
        description: 'AI Tidy feature requires an OpenRouter API key. Please check the environment configuration.',
        variant: 'destructive',
      })
    } finally {
      setIsAiTidying(false)
    }
  }

  const toggleArchiveStatus = async () => {
    if (!currentDocumentId || !document) return

    try {
      const newStatus = document.status === 'archived' ? 'published' : 'archived'
      const { error } = await supabase
        .from('documents')
        .update({ status: newStatus })
        .eq('id', currentDocumentId)

      if (error) throw error

      setDocument({ ...document, status: newStatus })

      toast({
        title: newStatus === 'archived' ? 'Document archived' : 'Document unarchived',
        description: newStatus === 'archived'
          ? 'Document has been moved to archive'
          : 'Document has been restored to published',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error toggling archive status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update document status. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const deleteDocument = async () => {
    if (!currentDocumentId || !document) return

    const confirmMessage = `Are you sure you want to delete "${document.title}"? This action cannot be undone and will also delete all votes and comments.`
    if (!window.confirm(confirmMessage)) return

    setDeleting(true)

    try {
      const response = await fetch(`/api/documents/${currentDocumentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete document')
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete document. Please try again.',
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-6">
        {/* Document Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              {/* Share controls - always visible horizontal layout */}
              <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  {document?.is_public ? (
                    <Globe className="w-4 h-4 text-green-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-sm font-medium">
                    {document?.is_public ? 'Public' : 'Private'}
                  </span>
                  <Switch
                    checked={document?.is_public || false}
                    onCheckedChange={togglePublicStatus}
                    disabled={!currentDocumentId}
                  />
                </div>

                {document?.is_public && (
                  <>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/public/${slug || currentDocumentId}`, '_blank')}
                      className="h-7 px-2"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyPublicLink}
                      className="h-7 px-2"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </>
                )}
              </div>

              {/* Custom URL input - only show when public */}
              {document?.is_public && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
                  <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/public/</span>
                  <Input
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="custom-url"
                    className="h-7 text-sm w-40 px-2"
                  />
                  {slug !== (document?.slug || '') ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveSlug}
                      disabled={slugSaving || !!slugError}
                      className="h-7 px-2"
                    >
                      {slugSaving ? 'Saving...' : 'Save'}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copySlugUrl}
                      className="h-7 px-2"
                    >
                      {slugCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  {slugError && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>{slugError}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Show different buttons based on public/private state */}
              {document?.is_public ? (
                <>
                  {/* When public: show Archive and Delete buttons */}
                  <Button
                    onClick={toggleArchiveStatus}
                    disabled={!currentDocumentId}
                    variant="outline"
                    size="sm"
                  >
                    {document?.status === 'archived' ? (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        Unarchive
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Archive
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={deleteDocument}
                    disabled={deleting || !currentDocumentId}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </>
              ) : (
                <>
                  {/* When private: show AI Tidy, Save, and overflow menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={toggleArchiveStatus}
                        disabled={!currentDocumentId}
                      >
                        {document?.status === 'archived' ? (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Unarchive Document
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Archive Document
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={deleteDocument}
                        disabled={deleting || !currentDocumentId}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleting ? 'Deleting...' : 'Delete Document'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={handleAiTidyContent}
                    disabled={isAiTidying || !content.trim()}
                    variant="outline"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isAiTidying ? 'AI Tidying...' : 'AI Tidy'}
                  </Button>
                  <Button
                    onClick={() => saveDocument()}
                    disabled={saving}
                    variant="outline"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
              <Button
                onClick={() => setShowAnalytics(!showAnalytics)}
                variant="outline"
                size="sm"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>

          {/* Title and Meta Info */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={`text-3xl font-bold border-none shadow-none px-0 focus-visible:ring-0 mb-2 ${document?.is_public ? 'cursor-not-allowed opacity-75' : ''}`}
                placeholder="Enter document title..."
                readOnly={document?.is_public || false}
                disabled={document?.is_public || false}
              />
              <p className="text-muted-foreground">
                {content.split(/\s+/).length} words • {Math.ceil(content.split(/\s+/).length / 200)} min read
              </p>
            </div>
            {lastSaved && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Vote Analytics Panel */}
        {showAnalytics && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Vote Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* Total Votes */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Votes</p>
                  <p className="text-3xl font-bold">{analytics.totalVotes}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-green-600" />
                      {analytics.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3 text-red-600" />
                      {analytics.downvotes}
                    </span>
                  </div>
                </div>

                {/* Unique Voters */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Unique Voters</p>
                  <p className="text-3xl font-bold">{analytics.uniqueVoters}</p>
                  <div className="flex gap-4 text-sm">
                    <span>Auth: {analytics.authVoters}</span>
                    <span>Anon: {analytics.anonVoters}</span>
                  </div>
                </div>

                {/* Engagement Rate */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="text-3xl font-bold">
                    {elements.length > 0
                      ? Math.round((analytics.totalVotes / elements.length) * 100) / 100
                      : 0}
                  </p>
                  <p className="text-sm">votes per element</p>
                </div>
              </div>

              {/* Top Voted Elements */}
              {analytics.topElements.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Top Voted Elements</h4>
                  <div className="space-y-2">
                    {analytics.topElements.map((element, index) => (
                      <div key={element.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <span className="text-sm truncate max-w-md">
                            {element.content}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${
                          element.score > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {element.score > 0 ? '+' : ''}{element.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Editor */}
        <Card>
          {document?.is_public && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              This document is published and cannot be edited. Make it private to enable editing.
            </div>
          )}
          <CardContent className="p-0">
            <MarkdownEditor
              initialContent={content}
              onSave={(newContent) => saveDocument(newContent, title)}
              onChange={handleContentChange}
              readOnly={document?.is_public || false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}