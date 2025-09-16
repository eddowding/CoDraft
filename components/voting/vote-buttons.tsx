'use client'

import { useState, useEffect } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoteButtonsProps {
  elementId: string
  currentVoteScore: number
  onVoteUpdate: () => void
}

export function VoteButtons({ elementId, currentVoteScore, onVoteUpdate }: VoteButtonsProps) {
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [loading, setLoading] = useState(false)
  const [voteScore, setVoteScore] = useState(currentVoteScore)

  const supabase = createClientSupabase()

  useEffect(() => {
    fetchUserVote()
    setVoteScore(currentVoteScore)
  }, [elementId, currentVoteScore])

  const fetchUserVote = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase
        .from('votes')
        .select('value')
        .eq('element_id', elementId)
        .eq('user_id', user.user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setUserVote(data.value as 1 | -1)
      }
    } catch (error) {
      console.error('Error fetching user vote:', error)
    }
  }

  const handleVote = async (value: 1 | -1) => {
    setLoading(true)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      let newVote: 1 | -1 | null

      // Cycle through states: null -> 1 -> null -> -1 -> null -> 1...
      if (value === 1) {
        // Upvote button clicked
        if (userVote === null) {
          newVote = 1  // null -> upvote
        } else if (userVote === 1) {
          newVote = null  // upvote -> null
        } else {
          newVote = 1  // downvote -> upvote
        }
      } else {
        // Downvote button clicked
        if (userVote === null) {
          newVote = -1  // null -> downvote
        } else if (userVote === -1) {
          newVote = null  // downvote -> null
        } else {
          newVote = -1  // upvote -> downvote
        }
      }

      // Apply the vote change
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
      const oldVote = userVote || 0
      const newVoteValue = newVote || 0
      setUserVote(newVote)
      setVoteScore(prev => prev - oldVote + newVoteValue)

      // Update vote counts in elements table
      await updateElementVoteCounts()
      onVoteUpdate()

    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateElementVoteCounts = async () => {
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

      // Update element
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

  return (
    <div className="flex flex-col items-center gap-1" data-element-id={elementId}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(1)}
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
        voteScore > 0 && "text-green-700 bg-green-100",
        voteScore < 0 && "text-red-700 bg-red-100",
        voteScore === 0 && "text-gray-600"
      )}>
        {voteScore}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(-1)}
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
}