'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnonymousSession } from '@/hooks/use-anonymous-session'
import { EmailVoteModal } from '@/components/voting/email-vote-modal'

interface VoteButtonsProps {
  elementId: string
  currentVoteScore: number
  onVoteUpdate: () => void
  allowAnonymous?: boolean
}

export interface VoteButtonsHandle {
  cycleForward: () => void
  cycleBackward: () => void
}

export const VoteButtons = forwardRef<VoteButtonsHandle, VoteButtonsProps>(
  ({ elementId, currentVoteScore, onVoteUpdate, allowAnonymous = false }, ref) => {
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [pendingVote, setPendingVote] = useState<1 | -1 | null>(null)
  const supabase = createClientSupabase()
  const { sessionId, email, emailVerified, ensureSession, sendVerificationEmail } = useAnonymousSession()

  useEffect(() => {
    fetchUserVote()
  }, [elementId, sessionId, email, allowAnonymous])

  const fetchUserVote = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()

      if (user.user) {
        // Authenticated user
        setIsAuthenticated(true)
        const { data, error } = await supabase
          .from('votes')
          .select('value')
          .eq('element_id', elementId)
          .eq('user_id', user.user.id)
          .maybeSingle()

        if (error) throw error
        if (data) {
          setUserVote(data.value as 1 | -1)
        } else {
          setUserVote(null)
        }
      } else if (allowAnonymous && sessionId) {
        // Anonymous user with session
        setIsAuthenticated(false)

        // Try to fetch by session_id (not anonymous_id!)
        const { data, error } = await supabase
          .from('votes')
          .select('value')
          .eq('element_id', elementId)
          .eq('session_id', sessionId)
          .maybeSingle()

        if (error) {
          console.error('Error fetching vote by session:', error)
        } else if (data) {
          setUserVote(data.value as 1 | -1)
        } else if (email) {
          // Also try by email if available
          const { data: emailVote, error: emailError } = await supabase
            .from('votes')
            .select('value')
            .eq('element_id', elementId)
            .eq('email', email)
            .maybeSingle()

          if (!emailError && emailVote) {
            setUserVote(emailVote.value as 1 | -1)
          } else {
            setUserVote(null)
          }
        } else {
          setUserVote(null)
        }
      } else {
        setUserVote(null)
      }
    } catch (error) {
      console.error('Error fetching user vote:', error)
    }
  }

  // Direct vote (button clicks)
  const handleDirectVote = async (value: 1 | -1) => {
    const { data: user } = await supabase.auth.getUser()

    if (user.user) {
      // Authenticated user - vote directly
      await applyAuthenticatedVote(value)
    } else if (allowAnonymous) {
      // Anonymous user - ALWAYS require email first for new votes
      if (!email && userVote === null && value !== null) {
        // First vote - require email
        setPendingVote(value)
        setShowEmailModal(true)
      } else {
        // Already have email or removing vote - proceed
        await applyAnonymousVote(value)
      }
    } else {
      // Anonymous voting not allowed - show message
      alert('Please sign in to vote on this document')
    }
  }

  // Handle email submission from modal
  const handleEmailSubmit = async (userEmail: string) => {
    if (!userEmail || pendingVote === null) return

    // Create/update session with email
    const newSessionId = await ensureSession(userEmail)

    if (newSessionId) {
      // Apply the pending vote with email
      await applyAnonymousVote(pendingVote, userEmail)

      // Send verification email
      if (userEmail) {
        try {
          await sendVerificationEmail()
        } catch (error) {
          console.error('Failed to send verification email:', error)
        }
      }
    }

    setPendingVote(null)
    setShowEmailModal(false)
  }

  // Cycle forward (right arrow)
  const handleCycleForward = async () => {
    let newVote: 1 | -1 | null

    if (userVote === -1) {
      newVote = null  // -1 → 0
    } else if (userVote === null) {
      newVote = 1     // 0 → +1
    } else {
      newVote = null  // +1 → 0
    }

    await handleVoteChange(newVote)
  }

  // Cycle backward (left arrow)
  const handleCycleBackward = async () => {
    let newVote: 1 | -1 | null

    if (userVote === 1) {
      newVote = null  // +1 → 0
    } else if (userVote === null) {
      newVote = -1    // 0 → -1
    } else {
      newVote = null  // -1 → 0
    }

    await handleVoteChange(newVote)
  }

  // Handle vote change from keyboard
  const handleVoteChange = async (newVote: 1 | -1 | null) => {
    const { data: user } = await supabase.auth.getUser()

    if (user.user) {
      await applyAuthenticatedVote(newVote)
    } else if (allowAnonymous) {
      // For keyboard navigation, require email on first vote
      if (!email && userVote === null && newVote !== null) {
        setPendingVote(newVote)
        setShowEmailModal(true)
      } else {
        await applyAnonymousVote(newVote)
      }
    } else {
      alert('Please sign in to vote on this document')
    }
  }

  // Apply authenticated vote (direct to Supabase)
  const applyAuthenticatedVote = async (newVote: 1 | -1 | null) => {
    setLoading(true)

    // Optimistic update
    const previousVote = userVote
    setUserVote(newVote)

    try {
      const { data: user } = await supabase.auth.getUser()

      if (!user.user) throw new Error('Not authenticated')

      if (newVote === null) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('element_id', elementId)
          .eq('user_id', user.user.id)

        if (error) throw error
      } else {
        // Upsert vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            element_id: elementId,
            user_id: user.user.id,
            value: newVote,
          })

        if (error) throw error
      }

      // Notify parent to refresh
      onVoteUpdate()

    } catch (error) {
      console.error('Error voting:', error)
      // Revert optimistic update
      setUserVote(previousVote)
    } finally {
      setLoading(false)
    }
  }

  // Apply anonymous vote (through API route for security)
  const applyAnonymousVote = async (newVote: 1 | -1 | null, userEmail?: string) => {
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

      // Notify parent to refresh
      onVoteUpdate()

    } catch (error: any) {
      console.error('Error voting:', error)
      alert(error.message || 'Failed to vote. Please try again.')
      // Revert optimistic update
      setUserVote(previousVote)
    } finally {
      setLoading(false)
    }
  }

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
          currentVoteScore > 0 && "text-green-700 bg-green-100",
          currentVoteScore < 0 && "text-red-700 bg-red-100",
          currentVoteScore === 0 && "text-gray-600"
        )}>
          {currentVoteScore}
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