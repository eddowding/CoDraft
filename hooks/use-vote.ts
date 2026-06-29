'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientSupabase } from '@/lib/supabase'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'

type VoteValue = 1 | -1 | null

interface UseVoteOptions {
  elementId: string
  // newScore is the element's aggregate vote_score; userVote is the caller's
  // own vote (1/-1/null) so 'mine'-mode UI can repaint without a refetch.
  onVoteUpdate?: (newScore: number, userVote: VoteValue) => void
}

/**
 * Hook for managing votes on an element with React Query
 * Provides optimistic updates and automatic cache invalidation
 */
export function useVote({ elementId, onVoteUpdate }: UseVoteOptions) {
  const supabase = createClientSupabase()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuth()

  // Query for the user's current vote on this element
  const {
    data: userVote,
    isLoading: isLoadingVote,
  } = useQuery({
    queryKey: ['vote', elementId, user?.id],
    queryFn: async (): Promise<VoteValue> => {
      if (!user) return null

      const { data, error } = await supabase
        .from('votes')
        .select('value')
        .eq('element_id', elementId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return (data?.value as VoteValue) ?? null
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Mutation for voting
  const voteMutation = useMutation({
    mutationFn: async (newVote: VoteValue) => {
      if (!user) throw new Error('Not authenticated')

      if (newVote === null) {
        // Remove vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('element_id', elementId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Upsert vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            element_id: elementId,
            user_id: user.id,
            value: newVote,
          })

        if (error) throw error
      }

      // Fetch the updated score
      const { data: elementData, error: fetchError } = await supabase
        .from('elements')
        .select('vote_score')
        .eq('id', elementId)
        .single()

      if (fetchError) throw fetchError

      return { newVote, newScore: elementData.vote_score }
    },
    onMutate: async (newVote) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['vote', elementId, user?.id] })

      // Snapshot the previous value
      const previousVote = queryClient.getQueryData<VoteValue>(['vote', elementId, user?.id])

      // Optimistically update to the new value
      queryClient.setQueryData(['vote', elementId, user?.id], newVote)

      return { previousVote }
    },
    onError: (err, newVote, context) => {
      // Rollback on error
      if (context?.previousVote !== undefined) {
        queryClient.setQueryData(['vote', elementId, user?.id], context.previousVote)
      }
      logger.error('Vote mutation failed', err)
    },
    onSuccess: (data) => {
      // Update the cache with the confirmed value
      queryClient.setQueryData(['vote', elementId, user?.id], data.newVote)

      // Notify parent of score change (and the caller's own vote)
      onVoteUpdate?.(data.newScore, data.newVote)
    },
  })

  const vote = async (value: VoteValue) => {
    if (!isAuthenticated) {
      return { requiresAuth: true }
    }
    await voteMutation.mutateAsync(value)
    return { requiresAuth: false }
  }

  const cycleVoteForward = async () => {
    let newVote: VoteValue
    if (userVote === -1) {
      newVote = null
    } else if (userVote === null) {
      newVote = 1
    } else {
      newVote = null
    }
    return vote(newVote)
  }

  const cycleVoteBackward = async () => {
    let newVote: VoteValue
    if (userVote === 1) {
      newVote = null
    } else if (userVote === null) {
      newVote = -1
    } else {
      newVote = null
    }
    return vote(newVote)
  }

  return {
    userVote: userVote ?? null,
    isLoading: isLoadingVote || voteMutation.isPending,
    isAuthenticated,
    vote,
    cycleVoteForward,
    cycleVoteBackward,
  }
}
