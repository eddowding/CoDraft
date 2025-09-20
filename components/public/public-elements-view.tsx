'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// TODO: Add tooltip component
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  const [voteDisplay, setVoteDisplay] = useState<'all' | 'auth' | 'mine' | 'none'>('none')
  const [totalUniqueVoters, setTotalUniqueVoters] = useState<number>(0)
  const [userVotes, setUserVotes] = useState<Record<string, number>>({})
  const [sessionVotes, setSessionVotes] = useState<Set<string>>(new Set())
  const [refreshingVotes, setRefreshingVotes] = useState(false)
  const voteButtonRefs = useRef<Map<string, VoteButtonsHandle>>(new Map())
  const supabase = createClientSupabase()

  useEffect(() => {
    fetchDocumentAndElements()
    fetchTotalUniqueVoters()
    fetchUserVotes()
  }, [documentId])

  const fetchUserVotes = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()

      if (userData.user) {
        // Authenticated user - fetch by user_id
        const { data: elementsData } = await supabase
          .from('elements')
          .select('id')
          .eq('document_id', documentId)

        if (elementsData && elementsData.length > 0) {
          const elementIds = elementsData.map(e => e.id)

          const { data: votesData, error } = await supabase
            .from('votes')
            .select('element_id, value')
            .eq('user_id', userData.user.id)
            .in('element_id', elementIds)

          if (error) throw error

          const votes: Record<string, number> = {}
          votesData?.forEach(vote => {
            votes[vote.element_id] = vote.value
          })
          setUserVotes(votes)
        }
      } else {
        // Anonymous user - try to get session from cookie
        const response = await fetch('/api/anonymous-session')
        const sessionData = await response.json()

        if (sessionData.hasSession && sessionData.sessionId) {
          const { data: elementsData } = await supabase
            .from('elements')
            .select('id')
            .eq('document_id', documentId)

          if (elementsData && elementsData.length > 0) {
            const elementIds = elementsData.map(e => e.id)

            const { data: votesData, error } = await supabase
              .from('votes')
              .select('element_id, value')
              .eq('session_id', sessionData.sessionId)
              .in('element_id', elementIds)

            if (!error && votesData) {
              const votes: Record<string, number> = {}
              votesData.forEach(vote => {
                votes[vote.element_id] = vote.value
              })
              setUserVotes(votes)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user votes:', error)
    }
  }

  const fetchTotalUniqueVoters = async () => {
    try {
      const { data: elementsData } = await supabase
        .from('elements')
        .select('id')
        .eq('document_id', documentId)

      if (elementsData && elementsData.length > 0) {
        const elementIds = elementsData.map(e => e.id)

        const { data: votersData, error } = await supabase
          .from('votes')
          .select('user_id, session_id, email')  // Use session_id, not anonymous_id
          .in('element_id', elementIds)

        if (error) throw error

        // Count unique users across the document
        const uniqueVoters = new Set()

        votersData?.forEach(vote => {
          if (vote.user_id) {
            uniqueVoters.add(`user:${vote.user_id}`)
          } else if (vote.email) {
            uniqueVoters.add(`email:${vote.email}`)
          } else if (vote.session_id) {
            uniqueVoters.add(`session:${vote.session_id}`)
          }
        })

        const totalUniqueVoters = uniqueVoters.size
        setTotalUniqueVoters(totalUniqueVoters)
      }
    } catch (error) {
      console.error('Error fetching unique voters:', error)
    }
  }

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
        // TODO: Implement when comments table exists
        // const { data, error } = await supabase
        //   .from('comments')
        //   .select('element_id')
        //   .in('element_id', elementIds)
        //   .eq('is_deleted', false)

        // if (error) throw error

        // Count comments per element
        const counts: Record<string, number> = {}
        elementIds.forEach(id => counts[id] = 0)

        // data?.forEach(comment => {
        //   counts[comment.element_id] = (counts[comment.element_id] || 0) + 1
        // })

        setCommentCounts(counts)
      } catch (error) {
        console.error('Error fetching comment counts:', error)
      }
    }

    fetchCommentCounts()
  }, [elements, supabase])

  // Scroll focused element into view
  useEffect(() => {
    if (focusedElementIndex >= 0 && elements[focusedElementIndex]) {
      const elementId = elements[focusedElementIndex].id
      const element = typeof window !== 'undefined' ? window.document.getElementById(`element-${elementId}`) : null
      if (element) {
        // Get the element's position relative to viewport
        const rect = element.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        // Check if element is outside viewport
        if (rect.top < 100 || rect.bottom > viewportHeight - 100) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }
      }
    }
  }, [focusedElementIndex, elements])

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
          // Don't prevent spacebar when typing in input/textarea fields
          const target = event.target as HTMLElement
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return // Let the spacebar work normally in text fields
          }
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

      // console.log('Document loaded:', docData.title, 'login_not_required:', docData.login_not_required)
      // console.log('Full document data:', docData)
      setDocument(docData)

      // Fetch elements
      const { data: elementsData, error: elementsError } = await supabase
        .from('elements')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index')

      if (elementsError) throw elementsError

      // console.log('Fetched elements:', elementsData?.length, 'elements')
      // if (elementsData && elementsData.length > 0) {
      //   console.log('Sample element vote counts:', elementsData[0].vote_score, elementsData[0].upvote_count, elementsData[0].downvote_count)
      // }
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
        // TODO: Implement when comments table exists
        // const { data, error } = await supabase
        //   .from('comments')
        //   .select('id')
        //   .eq('element_id', elementId)
        //   .eq('is_deleted', false)

        // if (error) throw error

        setCommentCounts(prev => ({
          ...prev,
          [elementId]: 0 // data?.length || 0
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

  const handleVoteDisplayChange = async (newMode: 'all' | 'auth' | 'mine' | 'none') => {
    // Change the display mode immediately for responsiveness
    setVoteDisplay(newMode)

    // Don't refresh for 'none' mode since scores are hidden
    if (newMode === 'none') return

    // Refresh data for the new mode
    setRefreshingVotes(true)

    try {
      // Always refresh elements to get latest counts
      await fetchDocumentAndElements()

      // Refresh user votes for 'mine' mode or if switching from 'none'
      if (newMode === 'mine' || voteDisplay === 'none') {
        await fetchUserVotes()
      }

      // Refresh total voters for 'all' and 'auth' modes
      if (newMode === 'all' || newMode === 'auth') {
        await fetchTotalUniqueVoters()
      }
    } catch (error) {
      console.error('Error refreshing votes:', error)
    } finally {
      setRefreshingVotes(false)
    }
  }

  const shareDocument = async () => {
    const link = `${window.location.origin}/public/${documentId}`
    await navigator.clipboard.writeText(link)
    setCopiedPageLink(true)
    setTimeout(() => setCopiedPageLink(false), 2000)
  }

  const getVoteBackgroundStyle = (element: Element) => {
    if (voteDisplay === 'none') {
      // No backgrounds in 'none' mode
      return {}
    }

    // Always show backgrounds for all modes except 'none'
    // This lets users see voting patterns even before they vote

    if (voteDisplay === 'auth') {
      // Show only authenticated user votes
      const totalAuthVotes = (element.auth_upvote_count || 0) + (element.auth_downvote_count || 0)

      if (totalAuthVotes === 0) {
        return {}
      }

      const authUpvotePercent = Math.max(0, ((element.auth_upvote_count || 0) / totalAuthVotes) * 100)
      const authDownvotePercent = Math.max(0, ((element.auth_downvote_count || 0) / totalAuthVotes) * 100)
      const totalAuthVoted = Math.min(100, authUpvotePercent + authDownvotePercent)

      if (authUpvotePercent === 0 && authDownvotePercent === 0) {
        return { background: 'rgba(255, 255, 255, 0.05)' }
      }

      let gradient = 'linear-gradient(to right'
      if (authUpvotePercent > 0) {
        gradient += `, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.4) ${authUpvotePercent}%`
      }
      if (authDownvotePercent > 0) {
        gradient += `, rgba(239, 68, 68, 0.4) ${authUpvotePercent}%, rgba(239, 68, 68, 0.4) ${totalAuthVoted}%`
      }
      if (totalAuthVoted < 100) {
        gradient += `, rgba(255, 255, 255, 0.05) ${totalAuthVoted}%, rgba(255, 255, 255, 0.05) 100%`
      }
      gradient += ')'
      return { background: gradient }
    }

    if (voteDisplay === 'mine') {
      // Show only user's vote with solid color
      const userVote = userVotes[element.id]
      // console.log('Mine mode, userVote for', element.id, ':', userVote)
      if (userVote === 1) {
        return { background: 'rgba(34, 197, 94, 0.3)' } // Green for upvote
      } else if (userVote === -1) {
        return { background: 'rgba(239, 68, 68, 0.3)' } // Red for downvote
      } else {
        return { background: 'rgba(255, 255, 255, 0.05)' } // Light for no vote
      }
    }

    // voteDisplay === 'all' - show everyone's votes (auth + anonymous)
    if (totalUniqueVoters === 0) {
      // console.log('No unique voters, returning empty style')
      return {}
    }

    const upvotePercent = Math.max(0, (element.upvote_count / totalUniqueVoters) * 100)
    const downvotePercent = Math.max(0, (element.downvote_count / totalUniqueVoters) * 100)
    const totalVoted = Math.min(100, upvotePercent + downvotePercent)

    // console.log('Vote percentages for', element.id, '- up:', upvotePercent, 'down:', downvotePercent)

    // Handle edge cases
    if (upvotePercent === 0 && downvotePercent === 0) {
      return { background: 'rgba(255, 255, 255, 0.05)' } // Very light background for no votes
    }

    // Create a linear gradient with green for upvotes, red for downvotes, light gray for no votes
    let gradient = 'linear-gradient(to right'

    if (upvotePercent > 0) {
      gradient += `, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.4) ${upvotePercent}%`
    }

    if (downvotePercent > 0) {
      gradient += `, rgba(239, 68, 68, 0.4) ${upvotePercent}%, rgba(239, 68, 68, 0.4) ${totalVoted}%`
    }

    if (totalVoted < 100) {
      gradient += `, rgba(255, 255, 255, 0.05) ${totalVoted}%, rgba(255, 255, 255, 0.05) 100%`
    }

    gradient += ')'

    // console.log('Generated gradient:', gradient)

    return {
      background: gradient
    }
  }

  const renderElementContent = (element: Element) => {
    const content = element.content
    const type = element.type

    // Handle list items with nesting
    if (type === 'list') {
      // Extract nesting level from content indentation
      const match = content.match(/^(\s*)([-*])\s+(.*)$/)
      if (match) {
        const indentation = match[1]
        const cleanContent = match[3]

        // Calculate nesting level (each 2 spaces or 1 tab = 1 level)
        const nestingLevel = Math.floor(indentation.length / 2) + (indentation.includes('\t') ? indentation.split('\t').length - 1 : 0)

        return (
          <li className="ml-4" style={{ marginLeft: `${nestingLevel * 24 + 16}px` }}>
            {cleanContent}
          </li>
        )
      }

      // Fallback for malformed list items
      const cleanContent = content.replace(/^\s*[-*]\s*/, '')
      return <li className="ml-4">{cleanContent}</li>
    }

    switch (type) {
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

          {/* Vote Display Toggle */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Show votes:</span>
            <div className="flex rounded-md overflow-hidden border">
              <button
                onClick={() => handleVoteDisplayChange('all')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  voteDisplay === 'all'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleVoteDisplayChange('auth')}
                className={`px-3 py-1 text-xs font-medium transition-colors border-l ${
                  voteDisplay === 'auth'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Auth Only
              </button>
              <button
                onClick={() => handleVoteDisplayChange('mine')}
                className={`px-3 py-1 text-xs font-medium transition-colors border-l ${
                  voteDisplay === 'mine'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Mine
              </button>
              <button
                onClick={() => handleVoteDisplayChange('none')}
                className={`px-3 py-1 text-xs font-medium transition-colors border-l ${
                  voteDisplay === 'none'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                None
              </button>
            </div>
            {refreshingVotes && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Refreshing...
              </span>
            )}
            {!refreshingVotes && totalUniqueVoters > 0 && (
              <span className="text-xs text-muted-foreground">
                ({totalUniqueVoters} voters)
              </span>
            )}
          </div>
        </div>

        {/* Elements List */}
        <div className={cn(
          "space-y-2 transition-opacity duration-300",
          refreshingVotes && "opacity-70"
        )}>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">How Voting Works</h3>
                <div className="text-sm text-blue-800">
                  <p className="mb-1.5">
                    Votes and vote bars remain hidden until you cast your vote on each option. After voting, you’ll see results based on the selected display mode.
                  </p>
                  <p className="mb-1.5">
                    <strong>Keyboard:</strong>
                    <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mx-0.5">↑</kbd><kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mr-1">↓</kbd> navigate
                    <span className="mx-3"></span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mx-0.5">←</kbd> vote down
                    <span className="mx-3"></span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mx-0.5">→</kbd> vote up
                    <span className="mx-3"></span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mx-0.5">Enter</kbd>/<kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mr-1">Space</kbd> comments
                    <span className="mx-3"></span>
                    <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mx-0.5">Esc</kbd> deselect
                  </p>
                  <p className="mb-1.5"><strong>Mouse:</strong> Hover over any element to reveal voting buttons</p>
                  <p className="text-xs opacity-90">Show votes: switch between All, Auth Only, Mine or None. Results display after you vote.</p>
                </div>
              </div>
            </div>
          </div>

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
                    ? 'ring-2 ring-blue-500 border-blue-200'
                    : 'hover:shadow-sm'
                }`}
                style={getVoteBackgroundStyle(element)}
                onClick={() => setFocusedElementIndex(index)}
                onMouseEnter={() => setHoveredElementId(element.id)}
                onMouseLeave={() => setHoveredElementId(null)}
                tabIndex={0}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="markup hidden flex items-center gap-2 mb-2">
                        <Badge className={getElementTypeColor(element.type)}>
                          {element.type === 'list' ? (() => {
                            const match = element.content.match(/^(\s*)([-*])\s+/)
                            if (match) {
                              const indentation = match[1]
                              const nestingLevel = Math.floor(indentation.length / 2) + (indentation.includes('\t') ? indentation.split('\t').length - 1 : 0)
                              return nestingLevel > 0 ? `list (${nestingLevel + 1})` : 'list'
                            }
                            return 'list'
                          })() : element.type}
                        </Badge>
                      </div>

                      <div className="prose prose-sm max-w-none">
                        {renderElementContent(element)}
                      </div>

                    </div>

                    <div className={`flex items-center gap-2 transition-opacity duration-200 ${
                      isFocused || isHovered || voteDisplay === 'mine' || voteDisplay === 'auth' || voteDisplay === 'all' ? 'opacity-100' : 'opacity-0'
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

                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageCircle className="w-4 h-4" />
                        <span>{commentCounts[element.id] || 0}</span>
                      </div>

                      {/* Always show VoteButtons - they allow voting regardless of display mode */}
                      <VoteButtons
                        ref={(ref) => {
                          if (ref) {
                            voteButtonRefs.current.set(element.id, ref)
                          }
                        }}
                        elementId={element.id}
                        currentVoteScore={
                          voteDisplay === 'none' ? 0 :
                          voteDisplay === 'mine' ? (userVotes[element.id] || 0) :
                          voteDisplay === 'auth' ?
                            ((element.auth_upvote_count || 0) - (element.auth_downvote_count || 0)) :
                            element.vote_score // 'all' - default
                        }
                        hideScoreUntilVoted={voteDisplay === 'none'}
                        allowAnonymous={document?.login_not_required || false}
                        hasVotedInSession={sessionVotes.has(element.id)}
                        displayMode={voteDisplay}
                        onVoteUpdate={(newScore) => {
                          // Mark this element as voted on in the current session
                          setSessionVotes(prev => new Set(Array.from(prev).concat(element.id)))
                          // Update the element's score directly without refetching
                          setElements(prevElements =>
                            prevElements.map(el =>
                              el.id === element.id
                                ? { ...el, vote_score: newScore }
                                : el
                            )
                          )
                        }}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t">
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
