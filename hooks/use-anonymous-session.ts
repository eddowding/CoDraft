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
        email: email || null,
        emailVerified: data.emailVerified || false,
        isLoading: false,
        error: null
      })

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
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false
        }))
      }
    } catch (error) {
      console.error('Error checking session:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check session'
      }))
    }
  }

  const ensureSession = async (email?: string): Promise<string | null> => {
    if (state.sessionId && !email) {
      return state.sessionId
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

    // If email provided or no session exists, create/update session
    if (email || !state.sessionId) {
      return await createSession(email)
    }

    return state.sessionId
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
    // Always check for or create a session on mount
    const initSession = async () => {
      // First check if we have an existing session
      await checkExistingSession()

      // After checking, if still no session, create one immediately
      // Use a timeout to ensure state has updated from checkExistingSession
      setTimeout(async () => {
        if (!state.sessionId) {
          await createSession()
        }
      }, 100)
    }

    initSession()
  }, [])

  return {
    ...state,
    createSession,
    ensureSession,
    sendVerificationEmail
  }
}