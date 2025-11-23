import { NextRequest, NextResponse } from 'next/server'
import { createClientSupabase } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check for session cookie
    const sessionId = request.cookies.get('anonymous_session')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found. Please reload the page.' },
        { status: 401 }
      )
    }

    // Check rate limit using distributed storage
    const rateLimitResult = await rateLimit(`vote:${sessionId}`, 10, 60000)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many votes. Please wait a minute before voting again. Verify your email to unlock this.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
          }
        }
      )
    }

    // Parse request body
    const { elementId, value, email } = await request.json()

    if (!elementId || (value !== 1 && value !== -1 && value !== null)) {
      return NextResponse.json(
        { error: 'Invalid vote data' },
        { status: 400 }
      )
    }

    // Use client supabase - the RPC function has SECURITY DEFINER
    const supabase = createClientSupabase()

    // Call the secure database function to mutate the vote
    const operation = value === null ? 'delete' : 'upsert'

    const { data, error } = await (supabase as any).rpc('mutate_anonymous_vote', {
      p_session_id: sessionId,
      p_element_id: elementId,
      p_value: value || 0, // Pass 0 for deletes (won't be used)
      p_email: email || null,
      p_operation: operation
    })

    if (error) {
      logger.error('Error mutating anonymous vote', error)

      // Handle specific errors
      if (error.message?.includes('Invalid session')) {
        return NextResponse.json(
          { error: 'Session expired. Please reload the page.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update vote' },
        { status: 500 }
      )
    }

    // Return the updated counts from the database
    const updatedCounts = data?.[0] || { vote_score: 0, upvote_count: 0, downvote_count: 0 }

    return NextResponse.json({
      success: true,
      voteScore: updatedCounts.vote_score,
      upvoteCount: updatedCounts.upvote_count,
      downvoteCount: updatedCounts.downvote_count
    })

  } catch (error) {
    logger.error('Error in anonymous vote API', error)
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check for session cookie
    const sessionId = request.cookies.get('anonymous_session')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }

    // Parse request body
    const { elementId } = await request.json()

    if (!elementId) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Use client supabase - the RPC function has SECURITY DEFINER
    const supabase = createClientSupabase()

    // Call the secure database function to delete the vote
    const { data, error } = await (supabase as any).rpc('mutate_anonymous_vote', {
      p_session_id: sessionId,
      p_element_id: elementId,
      p_value: 0, // Not used for delete
      p_email: null,
      p_operation: 'delete'
    })

    if (error) {
      logger.error('Error deleting anonymous vote', error)
      return NextResponse.json(
        { error: 'Failed to delete vote' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error in anonymous vote deletion', error)
    return NextResponse.json(
      { error: 'Failed to delete vote' },
      { status: 500 }
    )
  }
}