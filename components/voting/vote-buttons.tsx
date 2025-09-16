'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoteButtonsProps {
  elementId: string
  currentVoteScore: number
  onVoteUpdate: () => void
}

export interface VoteButtonsHandle {
  cycleForward: () => void
  cycleBackward: () => void
}

export const VoteButtons = forwardRef<VoteButtonsHandle, VoteButtonsProps>(
  ({ elementId, currentVoteScore, onVoteUpdate }, ref) => {
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClientSupabase()

  useEffect(() => {
    fetchUserVote()
  }, [elementId])

  const fetchUserVote = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

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
    } catch (error) {
      console.error('Error fetching user vote:', error)
    }
  }

  // Direct vote (button clicks) - always go to that vote
  const handleDirectVote = async (value: 1 | -1) => {
    await applyVote(value)
  }

  // Cycle forward (right arrow) - goes through: current → next in sequence
  const handleCycleForward = async () => {
    let newVote: 1 | -1 | null

    if (userVote === -1) {
      newVote = null  // -1 → 0
    } else if (userVote === null) {
      newVote = 1     // 0 → +1
    } else {
      newVote = null  // +1 → 0
    }

    await applyVote(newVote)
  }

  // Cycle backward (left arrow) - goes through: current → previous in sequence
  const handleCycleBackward = async () => {
    let newVote: 1 | -1 | null

    if (userVote === 1) {
      newVote = null  // +1 → 0
    } else if (userVote === null) {
      newVote = -1    // 0 → -1
    } else {
      newVote = null  // -1 → 0
    }

    await applyVote(newVote)
  }

  // Apply the vote to database
  const applyVote = async (newVote: 1 | -1 | null) => {
    setLoading(true)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      if (newVote === null) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('element_id', elementId)
          .eq('user_id', user.user.id)

        if (error) throw error
      } else {
        // Insert or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            element_id: elementId,
            user_id: user.user.id,
            value: newVote,
          })

        if (error) throw error
      }

      // Update local state
      setUserVote(newVote)

      // Update vote counts in the database
      await updateVoteCounts()

      // Notify parent to refresh from database
      onVoteUpdate()

    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update the vote counts in the elements table
  const updateVoteCounts = async () => {
    try {
      // Get all votes for this element
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('value')
        .eq('element_id', elementId)

      if (votesError) throw votesError

      const upvotes = votes?.filter(v => v.value === 1).length || 0
      const downvotes = votes?.filter(v => v.value === -1).length || 0
      const totalVotes = upvotes + downvotes
      const score = upvotes - downvotes

      // Update element with new counts
      const { error: updateError } = await supabase
        .from('elements')
        .update({
          upvote_count: upvotes,
          downvote_count: downvotes,
          total_vote_count: totalVotes,
          vote_score: score,
          last_vote_sync: new Date().toISOString(),
        })
        .eq('id', elementId)

      if (updateError) throw updateError

    } catch (error) {
      console.error('Error updating vote counts:', error)
    }
  }

  // Expose methods via ref for parent component to call
  useImperativeHandle(ref, () => ({
    cycleForward: handleCycleForward,
    cycleBackward: handleCycleBackward
  }), [userVote])

  return (
    <div className="flex flex-col items-center gap-1" data-element-id={elementId}>
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

      <span className={cn(
        "text-sm font-bold px-2 py-1 rounded-full transition-all duration-200",
        currentVoteScore > 0 && "text-green-700 bg-green-100",
        currentVoteScore < 0 && "text-red-700 bg-red-100",
        currentVoteScore === 0 && "text-gray-600"
      )}>
        {currentVoteScore}
      </span>

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
    </div>
  )
})

VoteButtons.displayName = 'VoteButtons'