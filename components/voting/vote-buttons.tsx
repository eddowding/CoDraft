'use client'

import { useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MagicLinkModal } from '@/components/auth/magic-link-modal'
import { useToast } from '@/hooks/use-toast'
import { useVote } from '@/hooks/use-vote'

interface VoteButtonsProps {
  elementId: string
  currentVoteScore: number
  onVoteUpdate: (newScore: number) => void
  displayMode?: 'all' | 'auth' | 'mine' | 'none'
  documentTitle?: string
}

export interface VoteButtonsHandle {
  cycleForward: () => void
  cycleBackward: () => void
}

export const VoteButtons = forwardRef<VoteButtonsHandle, VoteButtonsProps>(
  ({ elementId, currentVoteScore, onVoteUpdate, displayMode = 'none', documentTitle }, ref) => {
    const [showMagicLinkModal, setShowMagicLinkModal] = useState(false)
    const { toast } = useToast()

    const {
      userVote,
      isLoading,
      isAuthenticated,
      vote,
      cycleVoteForward,
      cycleVoteBackward,
    } = useVote({
      elementId,
      onVoteUpdate,
    })

    // Handle vote button clicks
    const handleDirectVote = useCallback(async (value: 1 | -1) => {
      const result = await vote(value === userVote ? null : value)

      if (result.requiresAuth) {
        setShowMagicLinkModal(true)
        return
      }
    }, [vote, userVote])

    // Cycle forward (right arrow)
    const handleCycleForward = useCallback(async () => {
      const result = await cycleVoteForward()

      if (result.requiresAuth) {
        setShowMagicLinkModal(true)
        return
      }
    }, [cycleVoteForward])

    // Cycle backward (left arrow)
    const handleCycleBackward = useCallback(async () => {
      const result = await cycleVoteBackward()

      if (result.requiresAuth) {
        setShowMagicLinkModal(true)
        return
      }
    }, [cycleVoteBackward])

    // Expose methods via ref for parent component
    useImperativeHandle(ref, () => ({
      cycleForward: handleCycleForward,
      cycleBackward: handleCycleBackward
    }), [handleCycleForward, handleCycleBackward])

    return (
      <>
        <div className="flex items-center gap-1" data-element-id={elementId}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDirectVote(-1)}
            disabled={isLoading}
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
            disabled={isLoading}
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

        {/* Magic link modal for unauthenticated users */}
        <MagicLinkModal
          isOpen={showMagicLinkModal}
          onClose={() => setShowMagicLinkModal(false)}
          documentTitle={documentTitle}
        />
      </>
    )
  }
)

VoteButtons.displayName = 'VoteButtons'
