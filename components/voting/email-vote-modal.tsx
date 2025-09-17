'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EmailVoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (email: string) => Promise<void>
  voteType: 'up' | 'down' | null
}

export function EmailVoteModal({ isOpen, onClose, onSubmit, voteType }: EmailVoteModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address')
      }

      await onSubmit(email)
      setSuccess(true)

      // Show verification message
      setVerificationSent(true)

      // Close modal after a delay
      setTimeout(() => {
        onClose()
        // Reset state
        setEmail('')
        setSuccess(false)
        setVerificationSent(false)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit email')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Allow voting without email (pure anonymous)
    onSubmit('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Vote on This Element
          </DialogTitle>
          <DialogDescription>
            Enter your email to vote. We'll remember your votes and you can verify your email to have them count with full weight.
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Your email helps prevent spam and allows you to manage your votes
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <h4 className="text-sm font-medium">How it works:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Your vote will count immediately</li>
                <li>• Verified emails have full voting weight</li>
                <li>• Unverified votes count with reduced weight</li>
                <li>• We'll send a verification link (optional)</li>
              </ul>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={loading}
              >
                Skip & Vote Anonymously
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : `Vote ${voteType === 'up' ? 'Up' : 'Down'}`}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center justify-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <p className="text-center font-medium">Vote Recorded!</p>
              {verificationSent && (
                <p className="text-sm text-center text-muted-foreground">
                  Check your email for a verification link to give your votes full weight
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}