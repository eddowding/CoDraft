'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnonymousSession } from '@/hooks/use-anonymous-session'
import { EmailVoteModal } from '@/components/voting/email-vote-modal'

// Cache for user authentication state and votes
const authCache = new Map<string, { user: any; timestamp: number }>()
const voteCache = new Map<string, { vote: 1 | -1 | null; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

// Cache cleanup utility
const cleanupCache = () => {
  const now = Date.now()
  for (const [key, value] of authCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      authCache.delete(key)
    }
  }
  for (const [key, value] of voteCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      voteCache.delete(key)
    }
  }
}

// Cleanup cache every minute
setInterval(cleanupCache, 60000)

interface VoteButtonsProps {
  elementId: string
  currentVoteScore: number
  onVoteUpdate: (newScore: number) => void
  allowAnonymous?: boolean
  hideScoreUntilVoted?: boolean
  hasVotedInSession?: boolean
  displayMode?: 'all' | 'auth' | 'mine' | 'none'
}

export interface VoteButtonsHandle {
  cycleForward: () => void
  cycleBackward: () => void
}

export const VoteButtons = forwardRef<VoteButtonsHandle, VoteButtonsProps>(
  ({ elementId, currentVoteScore, onVoteUpdate, allowAnonymous = false, hideScoreUntilVoted = false, hasVotedInSession = false, displayMode = 'all' }, ref) => {
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [pendingVote, setPendingVote] = useState<1 | -1 | null>(null)
  const supabase = createClientSupabase()
  const { sessionId, email, emailVerified, ensureSession, sendVerificationEmail, createSession, checkExistingSession } = useAnonymousSession()

  // Memoize current user authentication
  const getCurrentUser = useCallback(async () => {
    const cacheKey = 'current_user'
    const cached = authCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.user
    }

    const { data: user } = await supabase.auth.getUser()
    authCache.set(cacheKey, { user: user.user, timestamp: Date.now() })
    return user.user
  }, [])

  // Optimized vote fetching with caching
  const fetchUserVote = useCallback(async () => {
    try {
      const voteKey = `${elementId}_${sessionId || 'no_session'}_${email || 'no_email'}`
      const cached = voteCache.get(voteKey)

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setUserVote(cached.vote)
        return
      }

      const user = await getCurrentUser()

      if (user) {
        // Authenticated user - single query
        setIsAuthenticated(true)
        const { data, error } = await supabase
          .from('votes')
          .select('value')
          .eq('element_id', elementId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error
        const vote = data?.value as 1 | -1 | null || null
        setUserVote(vote)
        voteCache.set(voteKey, { vote, timestamp: Date.now() })
      } else if (allowAnonymous && (sessionId || email)) {
        // Anonymous user - optimized single query
        setIsAuthenticated(false)

        let query = supabase
          .from('votes')
          .select('value')
          .eq('element_id', elementId)

        if (sessionId) {
          query = query.eq('session_id', sessionId)
        } else if (email) {
          query = query.eq('email', email)
        }

        const { data, error } = await query.maybeSingle()

        if (!error && data) {
          const vote = data.value as 1 | -1
          setUserVote(vote)
          voteCache.set(voteKey, { vote, timestamp: Date.now() })
        } else {
          setUserVote(null)
          voteCache.set(voteKey, { vote: null, timestamp: Date.now() })
        }
      } else {
        setUserVote(null)
      }
    } catch (error) {
      console.error('Error fetching user vote:', error)
      setUserVote(null)
    }
  }, [elementId, sessionId, email, allowAnonymous, getCurrentUser])

  useEffect(() => {
    fetchUserVote()
  }, [fetchUserVote])

  // Direct vote (button clicks) - optimized
  const handleDirectVote = useCallback(async (value: 1 | -1) => {
    const user = await getCurrentUser() // Use cached auth check

    if (user) {
      // Authenticated user - vote directly
      await applyAuthenticatedVote(value, user)
    } else if (allowAnonymous) {
      // Anonymous user - check session state first
      if (email || sessionId) {
        // Have session info - proceed with voting
        await applyAnonymousVote(value)
      } else {
        // No session yet - require email
        setPendingVote(value)
        setShowEmailModal(true)
      }
    } else {
      // Anonymous voting not allowed - show message
      alert('Please sign in to vote on this document')
    }
  }, [getCurrentUser, allowAnonymous, email, sessionId])

  // Handle email submission from modal
  const handleEmailSubmit = async (userEmail: string) => {
    if (pendingVote === null) return

    if (!userEmail) {
      // Skip path: ensure we have a session cookie, then vote without email
      if (!sessionId) {
        await createSession()
      }
      await applyAnonymousVote(pendingVote)
      setPendingVote(null)
      setShowEmailModal(false)
      return
    }

    // Create/update session with email
    const newSessionId = await ensureSession(userEmail)

    if (newSessionId) {
      // Apply the pending vote with email
      await applyAnonymousVote(pendingVote, userEmail)

      // Send verification email
      try {
        await sendVerificationEmail()
      } catch (error) {
        console.error('Failed to send verification email:', error)
      }
    }

    setPendingVote(null)
    setShowEmailModal(false)
  }

  // Cycle forward (right arrow) - optimized
  const handleCycleForward = useCallback(async () => {
    let newVote: 1 | -1 | null

    if (userVote === -1) {
      newVote = null  // -1 → 0
    } else if (userVote === null) {
      newVote = 1     // 0 → +1
    } else {
      newVote = null  // +1 → 0
    }

    await handleVoteChange(newVote)
  }, [userVote, handleVoteChange])

  // Cycle backward (left arrow) - optimized
  const handleCycleBackward = useCallback(async () => {
    let newVote: 1 | -1 | null

    if (userVote === 1) {
      newVote = null  // +1 → 0
    } else if (userVote === null) {
      newVote = -1    // 0 → -1
    } else {
      newVote = null  // -1 → 0
    }

    await handleVoteChange(newVote)
  }, [userVote, handleVoteChange])

  // Handle vote change from keyboard - optimized
  const handleVoteChange = useCallback(async (newVote: 1 | -1 | null) => {
    const user = await getCurrentUser() // Use cached auth check

    if (user) {
      await applyAuthenticatedVote(newVote, user)
    } else if (allowAnonymous) {
      // For keyboard navigation, use existing session info
      if (email || sessionId) {
        await applyAnonymousVote(newVote)
      } else {
        setPendingVote(newVote)
        setShowEmailModal(true)
      }
    } else {
      alert('Please sign in to vote on this document')
    }
  }, [getCurrentUser, allowAnonymous, email, sessionId])

  // Apply authenticated vote (direct to Supabase) - optimized
  const applyAuthenticatedVote = useCallback(async (newVote: 1 | -1 | null, user?: any) => {
    setLoading(true)

    // Optimistic update
    const previousVote = userVote
    setUserVote(newVote)

    try {
      // Use provided user or get from cache
      const currentUser = user || await getCurrentUser()
      if (!currentUser) throw new Error('Not authenticated')

      if (newVote === null) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('element_id', elementId)
          .eq('user_id', currentUser.id)

        if (error) throw error
      } else {
        // Upsert vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            element_id: elementId,
            user_id: currentUser.id,
            value: newVote,
          })

        if (error) throw error
      }

      // Fetch the updated score from the element
      const { data: elementData, error: fetchError } = await supabase
        .from('elements')
        .select('vote_score')
        .eq('id', elementId)
        .single()

      if (fetchError) throw fetchError

      // Update cache
      const voteKey = `${elementId}_${sessionId || 'no_session'}_${email || 'no_email'}`
      voteCache.set(voteKey, { vote: newVote, timestamp: Date.now() })

      // Notify parent with the new score
      onVoteUpdate(elementData.vote_score)

    } catch (error) {
      console.error('Error voting:', error)
      // Revert optimistic update
      setUserVote(previousVote)
    } finally {
      setLoading(false)
    }
  }, [userVote, elementId, getCurrentUser, sessionId, email, onVoteUpdate])

  // Apply anonymous vote (through API route for security) - optimized
  const applyAnonymousVote = useCallback(async (newVote: 1 | -1 | null, userEmail?: string) => {
    setLoading(true)

    // Optimistic update
    const previousVote = userVote
    setUserVote(newVote)

    try {
      const response = await fetch('/api/anonymous-vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elementId,
          value: newVote,
          email: userEmail || email
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to vote')
      }

      const result = await response.json()

      // Update cache
      const voteKey = `${elementId}_${sessionId || 'no_session'}_${(userEmail || email) || 'no_email'}`
      voteCache.set(voteKey, { vote: newVote, timestamp: Date.now() })

      // Notify parent with the new score from the server
      onVoteUpdate(result.voteScore)

    } catch (error: any) {
      console.error('Error voting:', error)
      alert(error.message || 'Failed to vote. Please try again.')
      // Revert optimistic update
      setUserVote(previousVote)
    } finally {
      setLoading(false)
    }
  }, [userVote, elementId, sessionId, email, onVoteUpdate])

  // Expose methods via ref for parent component
  useImperativeHandle(ref, () => ({
    cycleForward: handleCycleForward,
    cycleBackward: handleCycleBackward
  }), [userVote])

  return (
    <>
      <div className="flex items-center gap-1" data-element-id={elementId}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDirectVote(-1)}
          disabled={loading}
          data-vote="down"
          className={cn(
            "p-1 h-8 w-8 transition-all duration-200",
            userVote === -1
              ? "bg-red-500 text-white hover:bg-red-600 shadow-md transform scale-110"
              : "hover:bg-red-100 hover:text-red-700"
          )}
        >
          <ThumbsDown className={cn(
            "w-4 h-4 transition-transform",
            userVote === -1 && "scale-110"
          )} />
        </Button>

        <span className={cn(
          "text-sm font-bold px-2 py-1 rounded-full transition-all duration-200 min-w-[2rem] text-center",
          displayMode !== 'none' && currentVoteScore > 0 && "text-green-700 bg-green-100",
          displayMode !== 'none' && currentVoteScore < 0 && "text-red-700 bg-red-100",
          displayMode !== 'none' && currentVoteScore === 0 && "text-gray-600",
          displayMode === 'none' && "text-gray-400"
        )}>
          {displayMode === 'none' ? '—' :
           displayMode === 'mine' && userVote === null ? '0' :
           currentVoteScore}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDirectVote(1)}
          disabled={loading}
          data-vote="up"
          className={cn(
            "p-1 h-8 w-8 transition-all duration-200",
            userVote === 1
              ? "bg-green-500 text-white hover:bg-green-600 shadow-md transform scale-110"
              : "hover:bg-green-100 hover:text-green-700"
          )}
        >
          <ThumbsUp className={cn(
            "w-4 h-4 transition-transform",
            userVote === 1 && "scale-110"
          )} />
        </Button>
      </div>

      {/* Email collection modal - now required for first vote */}
      <EmailVoteModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false)
          setPendingVote(null)
        }}
        onSubmit={handleEmailSubmit}
        voteType={pendingVote === 1 ? 'up' : pendingVote === -1 ? 'down' : null}
      />
    </>
  )
})

VoteButtons.displayName = 'VoteButtons'
