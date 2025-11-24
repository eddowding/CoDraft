'use client'

import { useState } from 'react'
import { createClientSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'

interface AuthFormProps {
  mode?: 'signin' | 'signup'
  onToggleMode?: () => void
  redirectTo?: string
  onSuccess?: () => void
}

export function AuthForm({ mode = 'signin', onToggleMode, redirectTo, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const supabase = createClientSupabase()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setEmailSent(true)
      setMessage('Check your email for the magic link!')

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }


  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Sign In
        </CardTitle>
        <CardDescription className="text-center">
          {emailSent
            ? 'Magic link sent! Check your email'
            : 'Enter your email to receive a magic link'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!emailSent ? (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-800">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-green-600 mt-2">
                Click the link in your email to sign in
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailSent(false)
                setMessage('')
                setEmail('')
              }}
            >
              Try another email
            </Button>
          </div>
        )}

        {message && !emailSent && (
          <div className={`text-sm text-center ${
            message.includes('Check your email') ? 'text-green-600' : 'text-red-600'
          }`}>
            {message}
          </div>
        )}

        <div className="text-xs text-center text-muted-foreground">
          No password required. Just click the link in your email to sign in instantly.
        </div>
      </CardContent>
    </Card>
  )
}