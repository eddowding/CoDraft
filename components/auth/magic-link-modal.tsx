'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle2, AlertCircle, Vote, Shield, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClientSupabase } from '@/lib/supabase'

interface MagicLinkModalProps {
  isOpen: boolean
  onClose: () => void
  documentTitle?: string
  /** Optional callback when sign-in is successful */
  onSignInSuccess?: () => void
}

export function MagicLinkModal({ isOpen, onClose, documentTitle, onSignInSuccess }: MagicLinkModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const supabase = createClientSupabase()

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

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      })

      if (error) throw error

      setEmailSent(true)

      // Auto-close after 5 seconds to let them check email
      setTimeout(() => {
        onClose()
        onSignInSuccess?.()
        // Reset state for next time
        setEmail('')
        setEmailSent(false)
        setError(null)
      }, 5000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      // Reset state after animation
      setTimeout(() => {
        setEmail('')
        setEmailSent(false)
        setError(null)
      }, 300)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-blue-100 rounded-full">
              <Vote className="w-5 h-5 text-blue-600" />
            </div>
            Sign in to vote
          </DialogTitle>
          <DialogDescription className="text-base">
            {documentTitle
              ? `Join the conversation on "${documentTitle}"`
              : 'Sign in to share your opinion'}
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <div className="space-y-5">
            {/* Benefits section */}
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="flex flex-col items-center text-center p-2">
                <Zap className="w-5 h-5 text-amber-500 mb-1" />
                <span className="text-xs text-muted-foreground">Instant Access</span>
              </div>
              <div className="flex flex-col items-center text-center p-2">
                <Shield className="w-5 h-5 text-green-500 mb-1" />
                <span className="text-xs text-muted-foreground">No Password</span>
              </div>
              <div className="flex flex-col items-center text-center p-2">
                <Vote className="w-5 h-5 text-blue-500 mb-1" />
                <span className="text-xs text-muted-foreground">Vote Anywhere</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                  className="w-full h-11 text-base"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-medium"
                size="lg"
              >
                {loading ? (
                  <>
                    <Mail className="w-4 h-4 mr-2 animate-pulse" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Magic Link
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              We'll email you a secure link to sign in instantly.
              <br />No password required.
            </p>
          </div>
        ) : (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">Check your inbox!</p>
                <p className="text-sm text-muted-foreground">
                  We sent a magic link to
                </p>
              </div>
              <div className="bg-muted px-4 py-2 rounded-lg">
                <p className="font-medium text-sm">{email}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Next steps:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open the email from DocVote</li>
                  <li>Click the "Sign In" button</li>
                  <li>You'll be redirected back here</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
