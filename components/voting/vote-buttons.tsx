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

      // If user is clicking the same vote, remove it
      if (userVote === value) {
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('element_id', elementId)
          .eq('user_id', user.user.id)

        if (error) throw error

        setUserVote(null)
        setVoteScore(prev => prev - value)
      } else {
        // Insert or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            element_id: elementId,
            user_id: user.user.id,
            value,
          })

        if (error) throw error

        // Update local state
        const scoreChange = userVote ? value - userVote : value
        setUserVote(value)
        setVoteScore(prev => prev + scoreChange)
      }

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
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(1)}
        disabled={loading}
        className={cn(
          "p-1 h-8 w-8",
          userVote === 1 && "bg-green-100 text-green-700 hover:bg-green-100"
        )}
      >
        <ThumbsUp className="w-4 h-4" />
      </Button>

      <span className={cn(
        "text-sm font-medium",
        voteScore > 0 && "text-green-600",
        voteScore < 0 && "text-red-600"
      )}>
        {voteScore}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={cn(
          "p-1 h-8 w-8",
          userVote === -1 && "bg-red-100 text-red-700 hover:bg-red-100"
        )}
      >
        <ThumbsDown className="w-4 h-4" />
      </Button>
    </div>
  )
}