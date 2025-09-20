'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClientSupabase()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Name editing state
  const [displayName, setDisplayName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMessage, setNameMessage] = useState('')
  const [nameMessageType, setNameMessageType] = useState<'success' | 'error'>('success')

  // Password editing state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      setDisplayName(user.user_metadata?.display_name || user.user_metadata?.full_name || '')
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push('/auth')
      } else {
        setUser(session.user)
        setDisplayName(session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || '')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameLoading(true)
    setNameMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      })

      if (error) throw error

      setNameMessage('Display name updated successfully!')
      setNameMessageType('success')
    } catch (error: any) {
      setNameMessage(error.message || 'Failed to update display name')
      setNameMessageType('error')
    } finally {
      setNameLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage('')

    // Validation
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match')
      setPasswordMessageType('error')
      setPasswordLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters long')
      setPasswordMessageType('error')
      setPasswordLoading(false)
      return
    }

    try {
      // Update password (Supabase handles current password verification internally)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordMessage('Password updated successfully!')
      setPasswordMessageType('success')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setPasswordMessage(error.message || 'Failed to update password')
      setPasswordMessageType('error')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-6">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your display name and profile information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update your email.
                  </p>
                </div>

                <form onSubmit={handleNameUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>

                  {nameMessage && (
                    <Alert variant={nameMessageType === 'error' ? 'destructive' : 'default'}>
                      {nameMessageType === 'error' ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{nameMessage}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={nameLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {nameLoading ? 'Updating...' : 'Update Name'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Separator />

            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You can update your password directly since you're already authenticated.
                    If you want additional security, consider logging out and using the "Forgot Password" feature.
                  </p>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      required
                    />
                  </div>

                  {passwordMessage && (
                    <Alert variant={passwordMessageType === 'error' ? 'destructive' : 'default'}>
                      {passwordMessageType === 'error' ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>{passwordMessage}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={passwordLoading}>
                    <Lock className="h-4 w-4 mr-2" />
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}