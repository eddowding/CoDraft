'use client'

import { useState, useEffect } from 'react'

interface AnonymousSessionState {
  sessionId: string | null
  email: string | null
  emailVerified: boolean
  isLoading: boolean
  error: string | null
}

export function useAnonymousSession() {
  const [state, setState] = useState<AnonymousSessionState>({
    sessionId: null,
    email: null,
    emailVerified: false,
    isLoading: true,
    error: null
  })

  const generateFingerprint = () => {
    try {
      // Simple browser fingerprinting (non-invasive)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Anonymous session fingerprint', 2, 2)
      }

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|')

      return btoa(fingerprint).slice(0, 32)
    } catch (error) {
      return null
    }
  }

  const createSession = async (email?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const fingerprint = generateFingerprint()

      const response = await fetch('/api/anonymous-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fingerprint, email })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()

      setState({
        sessionId: data.sessionId,
        email: data.email || email || null,
        emailVerified: data.emailVerified || false,
        isLoading: false,
        error: null
      })

      // Notify other components (other VoteButtons) that session changed
      try { window.dispatchEvent(new CustomEvent('anonymous-session-updated')) } catch {}

      return data.sessionId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      return null
    }
  }

  const checkExistingSession = async () => {
    try {
      const response = await fetch('/api/anonymous-session')
      if (!response.ok) {
        throw new Error('Failed to check session')
      }

      const data = await response.json()

      if (data.hasSession) {
        setState({
          sessionId: data.sessionId,
          email: data.email || null,
          emailVerified: data.emailVerified || false,
          isLoading: false,
          error: null
        })
        return {
          hasSession: true,
          sessionId: data.sessionId as string,
          email: (data.email || null) as string | null,
          emailVerified: !!data.emailVerified
        }
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false
        }))
        return { hasSession: false } as const
      }
    } catch (error) {
      console.error('Error checking session:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check session'
      }))
      return { hasSession: false } as const
    }
  }

  const ensureSession = async (email: string): Promise<string | null> => {
    // Email is required for session creation
    if (!email) {
      console.error('Email is required to create a session')
      return null
    }

    if (state.isLoading) {
      // Wait for current operation to complete
      await new Promise(resolve => {
        const check = () => {
          if (!state.isLoading) {
            resolve(void 0)
          } else {
            setTimeout(check, 100)
          }
        }
        check()
      })
    }

    // Always create/update session with email
    return await createSession(email)
  }

  const sendVerificationEmail = async () => {
    if (!state.sessionId || !state.email) {
      throw new Error('No email or session to verify')
    }

    try {
      const response = await fetch('/api/anonymous-session/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: state.email,
          sessionId: state.sessionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send verification email')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error sending verification:', error)
      throw error
    }
  }

  useEffect(() => {
    // Only check for existing session on mount, don't create one
    checkExistingSession()

    // Also listen for cross-component notifications and refresh
    const onUpdate = () => { checkExistingSession() }
    try { window.addEventListener('anonymous-session-updated', onUpdate) } catch {}
    return () => { try { window.removeEventListener('anonymous-session-updated', onUpdate) } catch {} }
  }, [])

  return {
    ...state,
    createSession,
    ensureSession,
    sendVerificationEmail,
    checkExistingSession
  }
}
