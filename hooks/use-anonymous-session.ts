'use client'

import { useState, useEffect } from 'react'

interface AnonymousSessionState {
  sessionId: string | null
  isLoading: boolean
  error: string | null
}

export function useAnonymousSession() {
  const [state, setState] = useState<AnonymousSessionState>({
    sessionId: null,
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

  const createSession = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const fingerprint = generateFingerprint()

      const response = await fetch('/api/anonymous-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fingerprint })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()

      setState({
        sessionId: data.sessionId,
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

  const ensureSession = async (): Promise<string | null> => {
    if (state.sessionId) {
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

    if (!state.sessionId) {
      return await createSession()
    }

    return state.sessionId
  }

  useEffect(() => {
    checkExistingSession()
  }, [])

  return {
    ...state,
    createSession,
    ensureSession
  }
}