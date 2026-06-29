'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VoteButtons, VoteButtonsHandle } from '@/components/voting/vote-buttons'
import { CommentSection } from '@/components/comments/comment-section'
import { ThumbsUp, ThumbsDown, MessageCircle, ChevronDown, ChevronUp, Link2, Check, Eye, Share2, HelpCircle, Info, X } from 'lucide-react'
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
  const [voteDisplay, setVoteDisplay] = useState<'all' | 'auth' | 'mine' | 'none'>('all')
  const [totalUniqueVoters, setTotalUniqueVoters] = useState<number>(0)
  const [userVotes, setUserVotes] = useState<Record<string, number>>({})
  const [sessionVotes, setSessionVotes] = useState<Set<string>>(new Set())
  const [refreshingVotes, setRefreshingVotes] = useState(false)
  const [showVotingGuide, setShowVotingGuide] = useState(false)
  const [isGuideExpanded, setIsGuideExpanded] = useState(false)
  const voteButtonRefs = useRef<Map<string, VoteButtonsHandle>>(new Map())
  const supabase = createClientSupabase()

  // Show voting guide modal on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('codraft-voting-guide-seen')
    if (!hasSeenGuide) {
      setShowVotingGuide(true)
    }
  }, [])

  const handleCloseGuide = () => {
    setShowVotingGuide(false)
    localStorage.setItem('codraft-voting-guide-seen', 'true')
  }

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
      }
      // Anonymous users cannot vote - no session fetching needed
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
          .select('user_id')
          .in('element_id', elementIds)

        if (error) throw error

        // Count unique authenticated users across the document
        const uniqueVoters = new Set()
        votersData?.forEach(vote => {
          if (vote.user_id) uniqueVoters.add(vote.user_id)
        })

        setTotalUniqueVoters(uniqueVoters.size)
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
        case 'c':
        case 'C':
          // Open comments for focused element
          if (focusedElementIndex >= 0) {
            const target = event.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
              return // Let 'c' work normally in text fields
            }
            event.preventDefault()
            const element = elements[focusedElementIndex]
            setExpandedElements(prev => {
              const newExpanded = new Set(prev)
              newExpanded.add(element.id) // Always open, not toggle
              return newExpanded
            })
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [elements, focusedElementIndex])

  const fetchDocumentAndElements = async () => {
    try {
      // First try to fetch by ID (UUID), if that fails try by slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)

      let docData, docError

      if (isUuid) {
        // Fetch by ID
        const result = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single()
        docData = result.data
        docError = result.error
      } else {
        // Fetch by slug
        const result = await supabase
          .from('documents')
          .select('*')
          .eq('slug', documentId)
          .single()
        docData = result.data
        docError = result.error
      }

      if (docError || !docData) {
        if (docError?.code === 'PGRST116') {
          setError('Document not found')
        } else {
          throw docError || new Error('Document not found')
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

      // Fetch elements using the document's actual ID
      const { data: elementsData, error: elementsError } = await supabase
        .from('elements')
        .select('*')
        .eq('document_id', docData.id)
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
    // Use slug if available, otherwise use the document ID
    const docIdentifier = document?.slug || document?.id || documentId
    const link = `${window.location.origin}/public/${docIdentifier}#element-${elementId}`
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
    // Use slug if available, otherwise use the document ID
    const docIdentifier = document?.slug || document?.id || documentId
    const link = `${window.location.origin}/public/${docIdentifier}`
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
    // Use per-element vote totals, not document-wide voter count
    const totalVotesOnElement = (element.upvote_count || 0) + (element.downvote_count || 0)
    if (totalVotesOnElement === 0) {
      return {}
    }

    const upvotePercent = Math.max(0, ((element.upvote_count || 0) / totalVotesOnElement) * 100)
    const downvotePercent = Math.max(0, ((element.downvote_count || 0) / totalVotesOnElement) * 100)
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

  // Compact voting guide for popover/sidebar
  const VotingGuideCompact = () => (
    <div className="text-sm space-y-3">
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div><kbd className="px-1.5 py-0.5 bg-muted border rounded">↑</kbd><kbd className="px-1.5 py-0.5 bg-muted border rounded">↓</kbd> Navigate</div>
        <div><kbd className="px-1.5 py-0.5 bg-muted border rounded">←</kbd> Vote down</div>
        <div><kbd className="px-1.5 py-0.5 bg-muted border rounded">→</kbd> Vote up</div>
        <div><kbd className="px-1.5 py-0.5 bg-muted border rounded">C</kbd> Comments</div>
      </div>
      <div className="text-xs text-muted-foreground">
        <strong>All:</strong> Everyone's votes • <strong>Mine:</strong> Your votes • <strong>None:</strong> Hidden
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* First-time visitor voting guide modal - Aurora style */}
      <Dialog open={showVotingGuide} onOpenChange={(open) => !open && handleCloseGuide()}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border-0 shadow-2xl">
          {/* Header section with gradient */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-8 pt-8 pb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full text-sm text-slate-600 mb-4 shadow-sm">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Collaborative Feedback
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-3xl font-bold text-slate-900">
                Welcome to {document?.title ? `"${document.title}"` : 'the Document'}
              </DialogTitle>
              <DialogDescription className="text-base text-slate-600 max-w-md mx-auto">
                Your voice matters! Vote on each section to share your perspective and help shape this document.
              </DialogDescription>
            </DialogHeader>

            {/* Stats row */}
            <div className="flex justify-center gap-8 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{elements.length}</div>
                <div className="text-xs text-slate-500">Sections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalUniqueVoters}</div>
                <div className="text-xs text-slate-500">Voters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{document?.estimated_read_time || '~'}</div>
                <div className="text-xs text-slate-500">Min Read</div>
              </div>
            </div>
          </div>

          {/* Feature cards section */}
          <div className="px-8 py-6 bg-white">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Get Started in Seconds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Vote Card */}
              <div className="relative bg-slate-50 rounded-xl p-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <ThumbsUp className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Cast Your Vote</h4>
                <p className="text-xs text-slate-500">
                  Use <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">←</kbd> <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">→</kbd> arrows or click the thumbs to vote on each section.
                </p>
              </div>

              {/* Navigate Card */}
              <div className="relative bg-slate-50 rounded-xl p-4 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Navigate Fast</h4>
                <p className="text-xs text-slate-500">
                  Use <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">↓</kbd> to move between sections. Press <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">C</kbd> to comment.
                </p>
              </div>

              {/* View Results Card */}
              <div className="relative bg-slate-50 rounded-xl p-4 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">See Results</h4>
                <p className="text-xs text-slate-500">
                  Toggle between <strong>All</strong>, <strong>Mine</strong>, or <strong>None</strong> to control what voting results you see.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-50 border-t flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Hover over sections to reveal voting buttons
            </p>
            <Button onClick={handleCloseGuide} className="bg-blue-600 hover:bg-blue-700">
              Start Voting
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

        {/* Main content with sidebar layout */}
        <div className="flex gap-6">
          {/* Elements List - Main content */}
          <div className={cn(
            "flex-1 space-y-2 transition-opacity duration-300",
            refreshingVotes && "opacity-70"
          )}>
            {/* Collapsible voting guide inline - Aurora style */}
            <Collapsible open={isGuideExpanded} onOpenChange={setIsGuideExpanded}>
              <div className="mb-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium text-slate-900 text-sm block">Quick Guide</span>
                        <span className="text-xs text-slate-500">Keyboard shortcuts & display modes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 font-medium">
                        {isGuideExpanded ? 'Hide' : 'Show'}
                      </span>
                      {isGuideExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Vote shortcuts */}
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-medium text-slate-700">Voting</span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">←</kbd> Vote down</div>
                          <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">→</kbd> Vote up</div>
                        </div>
                      </div>
                      {/* Navigate shortcuts */}
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          <span className="text-xs font-medium text-slate-700">Navigation</span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">↓</kbd> Move</div>
                          <div><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">C</kbd> Comment</div>
                        </div>
                      </div>
                      {/* Display modes */}
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-medium text-slate-700">Display</span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <div><strong className="text-slate-600">All</strong> Everyone's votes</div>
                          <div><strong className="text-slate-600">Mine</strong> Only yours</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

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

                  {/* Floating action controls — revealed on hover/focus so they
                      don't reserve a permanent gutter. Backdrop chip keeps them
                      legible over the vote-proportion background bar. */}
                  <div
                    className={cn(
                      "absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg border border-slate-200/70 bg-white/85 px-1.5 py-1 shadow-sm backdrop-blur transition-opacity duration-200",
                      isFocused || isHovered ? "opacity-100" : "pointer-events-none opacity-0"
                    )}
                  >
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
                        displayMode={voteDisplay}
                        documentTitle={document?.title}
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

          {/* Sidebar - Vote Display Controls - Aurora style */}
          <div className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-6 space-y-4">
              {/* Vote Display Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Vote Display</h3>
                        <p className="text-xs text-slate-500">Control what you see</p>
                      </div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-slate-100">
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <VotingGuideCompact />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Toggle buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleVoteDisplayChange('all')}
                      className={`relative flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                        voteDisplay === 'all'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs font-medium">All</span>
                    </button>
                    <button
                      onClick={() => handleVoteDisplayChange('mine')}
                      className={`relative flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                        voteDisplay === 'mine'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-xs font-medium">Mine</span>
                    </button>
                    <button
                      onClick={() => handleVoteDisplayChange('none')}
                      className={`relative flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                        voteDisplay === 'none'
                          ? 'border-slate-500 bg-slate-100 text-slate-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      <span className="text-xs font-medium">None</span>
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    {refreshingVotes ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Refreshing...
                      </div>
                    ) : totalUniqueVoters > 0 ? (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-medium">{totalUniqueVoters}</span> {totalUniqueVoters === 1 ? 'voter' : 'voters'}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No votes yet</div>
                    )}
                    <div className="text-xs text-slate-400">
                      {elements.length} sections
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowVotingGuide(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <HelpCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 block">Voting Guide</span>
                        <span className="text-xs text-slate-500">Learn how to use this</span>
                      </div>
                    </button>
                    <button
                      onClick={shareDocument}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50/50 transition-all text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        copiedPageLink ? 'bg-green-200' : 'bg-green-100 group-hover:bg-green-200'
                      }`}>
                        {copiedPageLink ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Share2 className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 block">
                          {copiedPageLink ? 'Link Copied!' : 'Share Document'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {copiedPageLink ? 'Ready to paste' : 'Copy shareable link'}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Vote Display - Fixed bottom bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-40">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Votes:</span>
              <div className="flex rounded-md overflow-hidden border">
                <button
                  onClick={() => handleVoteDisplayChange('all')}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${
                    voteDisplay === 'all'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleVoteDisplayChange('mine')}
                  className={`px-2 py-1 text-xs font-medium transition-colors border-l ${
                    voteDisplay === 'mine'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  Mine
                </button>
                <button
                  onClick={() => handleVoteDisplayChange('none')}
                  className={`px-2 py-1 text-xs font-medium transition-colors border-l ${
                    voteDisplay === 'none'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  None
                </button>
              </div>
              {totalUniqueVoters > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({totalUniqueVoters})
                </span>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end" side="top">
                <VotingGuideCompact />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
}
