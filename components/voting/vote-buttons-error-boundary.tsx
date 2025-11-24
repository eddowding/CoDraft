'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react'

interface Props {
  children: ReactNode
  elementId?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class VoteButtonsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VoteButtons error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-1" title="Voting temporarily unavailable">
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="p-1 h-8 w-8 opacity-50"
          >
            <ThumbsDown className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">—</span>
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="p-1 h-8 w-8 opacity-50"
          >
            <ThumbsUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleRetry}
            className="p-1 h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
