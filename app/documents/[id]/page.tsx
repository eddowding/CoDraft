'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { MarkdownEditor } from '@/components/editor/markdown-editor'
import { ElementsList } from '@/components/editor/elements-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Save, Eye, Hash, ArrowLeft, Clock, Share2, Globe, Lock, Copy, Unlock } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Document = Database['public']['Tables']['documents']['Row']
type Element = Database['public']['Tables']['elements']['Row']

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params?.id as string
  const isNewDocument = documentId === 'new'

  const [document, setDocument] = useState<Document | null>(null)
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(!isNewDocument)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)

  // For new documents
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(isNewDocument ? null : documentId)

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

  // Handle URL hash for deep linking to elements
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const elementId = window.location.hash.replace('#element-', '')
      if (elementId) {
        // Switch to elements tab
        setActiveTab('elements')
        // Scroll to element after a brief delay
        setTimeout(() => {
          const element = window.document.getElementById(`element-${elementId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('ring-2', 'ring-blue-500')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500')
            }, 2000)
          }
        }, 500)
      }
    }
  }, [])

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
    } catch (error) {
      console.error('Error fetching elements:', error)
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
          status: 'draft',
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

    const publicLink = `${window.location.origin}/public/${currentDocumentId}`
    await navigator.clipboard.writeText(publicLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
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
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              {lastSaved && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {document?.is_public ? (
                          <Globe className="w-4 h-4 text-green-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-sm font-medium">
                          {document?.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                      <Switch
                        checked={document?.is_public || false}
                        onCheckedChange={togglePublicStatus}
                        disabled={!currentDocumentId}
                      />
                    </div>

                    {/* Login Not Required Toggle - only show when public */}
                    {document?.is_public && (
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {document?.login_not_required ? (
                            <Unlock className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm font-medium">
                            Login not required
                          </span>
                        </div>
                        <Switch
                          checked={document?.login_not_required || false}
                          onCheckedChange={toggleLoginRequired}
                          disabled={!currentDocumentId || !document?.is_public}
                        />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mb-3">
                      {document?.is_public
                        ? document?.login_not_required
                          ? 'Anyone with the link can view and vote without signing up'
                          : 'Anyone with the link can view and vote (login required)'
                        : 'Only you can access this document'
                      }
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {document?.is_public && (
                    <>
                      <DropdownMenuItem
                        onClick={() => window.open(`/public/${currentDocumentId}`, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Public Page
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={copyPublicLink}>
                        <Copy className="w-4 h-4 mr-2" />
                        {copiedLink ? 'Link Copied!' : 'Copy Public Link'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => saveDocument()}
                disabled={saving}
                variant="outline"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Editable Title */}
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-3xl font-bold border-none shadow-none px-0 focus-visible:ring-0"
            placeholder="Enter document title..."
          />
          <p className="text-muted-foreground mt-2">
            {content.split(/\s+/).length} words • {Math.ceil(content.split(/\s+/).length / 200)} min read
          </p>
        </div>

        {/* Editor Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="elements">
              <Hash className="w-4 h-4 mr-2" />
              Elements ({elements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <MarkdownEditor
                  initialContent={content}
                  onSave={(newContent) => saveDocument(newContent, title)}
                  onChange={handleContentChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {content.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index} className="text-3xl font-bold mb-4">{line.slice(2)}</h1>
                    } else if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-2xl font-semibold mb-3">{line.slice(3)}</h2>
                    } else if (line.startsWith('### ')) {
                      return <h3 key={index} className="text-xl font-medium mb-2">{line.slice(4)}</h3>
                    } else if (line.trim()) {
                      return <p key={index} className="mb-4">{line}</p>
                    }
                    return null
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elements" className="mt-6">
            <ElementsList
              elements={elements}
              onElementUpdate={fetchElements}
              documentId={currentDocumentId || ''}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}