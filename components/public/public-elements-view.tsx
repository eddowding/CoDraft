'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VoteButtons, VoteButtonsHandle } from '@/components/voting/vote-buttons'
import { CommentSection } from '@/components/comments/comment-section'
import { ThumbsUp, ThumbsDown, MessageCircle, ChevronDown, ChevronUp, Link2, Check, Eye, Share2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Element = Database['public']['Tables']['elements']['Row']
type Document = Database['public']['Tables']['documents']['Row']

interface PublicElementsViewProps {
  documentId: string
}

export function PublicElementsView({ documentId }: PublicElementsViewProps) {
  const [document, setDocument] = useState<Document | null>(null)
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set())
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [copiedElementId, setCopiedElementId] = useState<string | null>(null)
  const [copiedPageLink, setCopiedPageLink] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedElementIndex, setFocusedElementIndex] = useState<number>(-1)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)
  const voteButtonRefs = useRef<Map<string, VoteButtonsHandle>>(new Map())
  const supabase = createClientSupabase()

  useEffect(() => {
    fetchDocumentAndElements()
  }, [documentId])

  // Handle URL fragment on page load
  useEffect(() => {
    if (elements.length > 0 && typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.startsWith('#element-')) {
        const elementId = hash.slice(9) // Remove '#element-'
        const element = window.document.getElementById(`element-${elementId}`)
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })
          }, 100) // Small delay to ensure elements are rendered
        }
      }
    }
  }, [elements])

  // Fetch comment counts for all elements
  useEffect(() => {
    const fetchCommentCounts = async () => {
      if (elements.length === 0) return

      const elementIds = elements.map(e => e.id)

      try {
        const { data, error } = await supabase
          .from('comments')
          .select('element_id')
          .in('element_id', elementIds)
          .eq('is_deleted', false)

        if (error) throw error

        // Count comments per element
        const counts: Record<string, number> = {}
        elementIds.forEach(id => counts[id] = 0)

        data?.forEach(comment => {
          counts[comment.element_id] = (counts[comment.element_id] || 0) + 1
        })

        setCommentCounts(counts)
      } catch (error) {
        console.error('Error fetching comment counts:', error)
      }
    }

    fetchCommentCounts()
  }, [elements, supabase])

  // Handle keyboard navigation and voting
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (elements.length === 0) return

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          setFocusedElementIndex(prev =>
            prev <= 0 ? elements.length - 1 : prev - 1
          )
          break
        case 'ArrowDown':
          event.preventDefault()
          setFocusedElementIndex(prev =>
            prev >= elements.length - 1 ? 0 : prev + 1
          )
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (focusedElementIndex >= 0) {
            const elementId = elements[focusedElementIndex].id
            const ref = voteButtonRefs.current.get(elementId)
            ref?.cycleBackward()
          }
          break
        case 'ArrowRight':
          event.preventDefault()
          if (focusedElementIndex >= 0) {
            const elementId = elements[focusedElementIndex].id
            const ref = voteButtonRefs.current.get(elementId)
            ref?.cycleForward()
          }
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (focusedElementIndex >= 0) {
            const element = elements[focusedElementIndex]
            setExpandedElements(prev => {
              const newExpanded = new Set(prev)
              if (newExpanded.has(element.id)) {
                newExpanded.delete(element.id)
              } else {
                newExpanded.add(element.id)
              }
              return newExpanded
            })
          }
          break
        case 'Escape':
          event.preventDefault()
          setFocusedElementIndex(-1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [elements, focusedElementIndex])

  const fetchDocumentAndElements = async () => {
    try {
      // First fetch the document to check if it's public
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (docError) {
        if (docError.code === 'PGRST116') {
          setError('Document not found')
        } else {
          throw docError
        }
        return
      }

      // Check if document is public
      if (!docData.is_public) {
        setError('This document is not public')
        return
      }

      setDocument(docData)

      // Fetch elements
      const { data: elementsData, error: elementsError } = await supabase
        .from('elements')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index')

      if (elementsError) throw elementsError

      setElements(elementsData || [])
    } catch (error) {
      console.error('Error fetching document and elements:', error)
      setError('Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const updateCommentCount = (elementId: string) => {
    // Refresh comment count for this element
    const fetchSingleCommentCount = async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('id')
          .eq('element_id', elementId)
          .eq('is_deleted', false)

        if (error) throw error

        setCommentCounts(prev => ({
          ...prev,
          [elementId]: data?.length || 0
        }))
      } catch (error) {
        console.error('Error fetching comment count:', error)
      }
    }

    fetchSingleCommentCount()
  }

  const toggleExpanded = (elementId: string) => {
    const newExpanded = new Set(expandedElements)
    if (newExpanded.has(elementId)) {
      newExpanded.delete(elementId)
    } else {
      newExpanded.add(elementId)
    }
    setExpandedElements(newExpanded)
  }

  const getElementTypeColor = (type: string) => {
    switch (type) {
      case 'heading': return 'bg-blue-100 text-blue-800'
      case 'paragraph': return 'bg-gray-100 text-gray-800'
      case 'list': return 'bg-green-100 text-green-800'
      case 'code': return 'bg-purple-100 text-purple-800'
      case 'quote': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const copyDeepLink = async (elementId: string) => {
    const link = `${window.location.origin}/public/${documentId}#element-${elementId}`
    await navigator.clipboard.writeText(link)
    setCopiedElementId(elementId)
    setTimeout(() => setCopiedElementId(null), 2000)

    // Scroll to the element
    if (typeof window !== 'undefined') {
      const element = window.document.getElementById(`element-${elementId}`)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }
  }

  const shareDocument = async () => {
    const link = `${window.location.origin}/public/${documentId}`
    await navigator.clipboard.writeText(link)
    setCopiedPageLink(true)
    setTimeout(() => setCopiedPageLink(false), 2000)
  }

  const renderElementContent = (element: Element) => {
    const content = element.content

    switch (element.type) {
      case 'heading':
        if (content.startsWith('# ')) {
          return <h1 className="text-2xl font-bold">{content.slice(2)}</h1>
        } else if (content.startsWith('## ')) {
          return <h2 className="text-xl font-semibold">{content.slice(3)}</h2>
        } else if (content.startsWith('### ')) {
          return <h3 className="text-lg font-medium">{content.slice(4)}</h3>
        }
        return <h1 className="text-2xl font-bold">{content}</h1>

      case 'quote':
        return <blockquote className="border-l-4 border-muted pl-4 italic">{content.slice(2)}</blockquote>

      case 'list':
        return <li className="ml-4">{content.slice(2)}</li>

      case 'code':
        return <code className="block bg-muted p-2 rounded font-mono text-sm">{content}</code>

      default:
        // Handle bold and italic
        let processedContent = content
        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>')

        return <p dangerouslySetInnerHTML={{ __html: processedContent }} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
              <Button
                className="mt-4"
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!document || elements.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle>Public Document</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                No elements found in this document.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        {/* Document Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Eye className="w-3 h-3 mr-1" />
                Public
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground text-sm">
                {document.word_count} words • {document.estimated_read_time} min read
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={shareDocument}
              className="flex items-center gap-2"
            >
              {copiedPageLink ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share
                </>
              )}
            </Button>
          </div>

          <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
          <p className="text-muted-foreground">
            Vote and comment on individual elements of this document
          </p>
        </div>

        {/* Elements List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Elements ({elements.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vote on individual elements and add comments to provide feedback.
              </p>
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 rounded">
                <strong>Navigation:</strong> ↑↓ Navigate • → Cycle forward (0→+1→0→+1) • ← Cycle backward (0→-1→0→-1) • 👍👎 Direct vote • Enter/Space Expand comments • Esc Deselect • Hover to show voting buttons
              </div>
            </CardHeader>
          </Card>

          {elements.map((element, index) => {
            const isExpanded = expandedElements.has(element.id)
            const isFocused = focusedElementIndex === index
            const isHovered = hoveredElementId === element.id

            return (
              <Card
                key={element.id}
                id={`element-${element.id}`}
                className={`relative transition-all duration-200 cursor-pointer ${
                  isFocused
                    ? 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-200'
                    : 'hover:bg-gray-50/50'
                }`}
                onClick={() => setFocusedElementIndex(index)}
                onMouseEnter={() => setHoveredElementId(element.id)}
                onMouseLeave={() => setHoveredElementId(null)}
                tabIndex={0}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getElementTypeColor(element.type)}>
                          {element.type}
                        </Badge>
                      </div>

                      <div className="prose prose-sm max-w-none mb-3">
                        {renderElementContent(element)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {element.upvote_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3" />
                          {element.downvote_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {commentCounts[element.id] || 0} comments
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 transition-opacity duration-200 ${
                      isFocused || isHovered ? 'opacity-100' : 'opacity-0'
                    }`}>
                      {copiedElementId !== element.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyDeepLink(element.id)
                          }}
                          className="p-1 h-8 w-8"
                        >
                          <Link2 className="w-4 h-4" />
                        </Button>
                      )}

                      <VoteButtons
                        ref={(ref) => {
                          if (ref) {
                            voteButtonRefs.current.set(element.id, ref)
                          }
                        }}
                        elementId={element.id}
                        currentVoteScore={element.vote_score}
                        onVoteUpdate={fetchDocumentAndElements}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      <CommentSection
                        elementId={element.id}
                        onCommentUpdate={() => updateCommentCount(element.id)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}