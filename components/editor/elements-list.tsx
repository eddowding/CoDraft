'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VoteButtons } from '@/components/voting/vote-buttons'
import { CommentSection } from '@/components/comments/comment-section'
import { ThumbsUp, ThumbsDown, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Element = Database['public']['Tables']['elements']['Row']

interface ElementsListProps {
  elements: Element[]
  onElementUpdate: () => void
}

export function ElementsList({ elements, onElementUpdate }: ElementsListProps) {
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set())
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [focusedElementIndex, setFocusedElementIndex] = useState<number>(-1)
  const supabase = createClientSupabase()

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
            handleVote(elements[focusedElementIndex].id, -1)
          }
          break
        case 'ArrowRight':
          event.preventDefault()
          if (focusedElementIndex >= 0) {
            handleVote(elements[focusedElementIndex].id, 1)
          }
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (focusedElementIndex >= 0) {
            toggleExpanded(elements[focusedElementIndex].id)
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

  // Handle voting - this will trigger the VoteButtons component to handle the actual voting
  const handleVote = async (elementId: string, value: 1 | -1) => {
    // Just trigger the vote - let VoteButtons handle the actual logic
    // This ensures consistency and avoids duplicate voting logic
    const voteButtonsElement = document.querySelector(`[data-element-id="${elementId}"]`)
    if (voteButtonsElement) {
      const button = voteButtonsElement.querySelector(
        value === 1 ? '[data-vote="up"]' : '[data-vote="down"]'
      ) as HTMLButtonElement

      if (button) {
        button.click()
      }
    }
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

  if (elements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Elements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No elements found. Start writing to see your content broken down into voteable elements.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Document Elements ({elements.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vote on individual elements and add comments to collaborate effectively.
          </p>
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-50 rounded">
            <strong>Keyboard shortcuts:</strong> ↑↓ Navigate • ←→ Cycle votes (Left=downvote cycle, Right=upvote cycle) • Enter/Space Expand • Esc Deselect
          </div>
        </CardHeader>
      </Card>

      {elements.map((element, index) => {
        const isExpanded = expandedElements.has(element.id)
        const isFocused = focusedElementIndex === index

        return (
          <Card
            key={element.id}
            className={`relative transition-all duration-200 cursor-pointer ${
              isFocused
                ? 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-200'
                : 'hover:bg-gray-50/50'
            }`}
            onClick={() => setFocusedElementIndex(index)}
            tabIndex={0}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getElementTypeColor(element.type)}>
                      {element.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Order: {element.order_index + 1}
                    </span>
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
                    <div className="ml-auto">
                      Score: {element.vote_score}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <VoteButtons
                    elementId={element.id}
                    currentVoteScore={element.vote_score}
                    onVoteUpdate={onElementUpdate}
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(element.id)}
                    className="p-1"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
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
  )
}