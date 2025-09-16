import { NextRequest, NextResponse } from 'next/server'
import { createClientSupabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientSupabase()

    // Generate a unique session ID
    const sessionId = randomBytes(16).toString('hex')

    // Get client information
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIP || request.ip || 'unknown'

    // Get fingerprint from request body (optional)
    const body = await request.json().catch(() => ({}))
    const fingerprintHash = body.fingerprint || null

    // Create anonymous session
    const { data, error } = await supabase
      .from('anonymous_sessions')
      .insert({
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        fingerprint_hash: fingerprintHash
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      sessionId: sessionId
    })

    response.cookies.set('anonymous_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Error creating anonymous session:', error)
    return NextResponse.json(
      { error: 'Failed to create anonymous session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user already has an anonymous session
    const sessionId = request.cookies.get('anonymous_session')?.value

    if (sessionId) {
      const supabase = createClientSupabase()

      // Verify session exists and update last_seen
      const { data, error } = await supabase
        .from('anonymous_sessions')
        .select('session_id')
        .eq('session_id', sessionId)
        .single()

      if (data && !error) {
        // Update last_seen
        await supabase
          .from('anonymous_sessions')
          .update({ last_seen: new Date().toISOString() })
          .eq('session_id', sessionId)

        return NextResponse.json({
          hasSession: true,
          sessionId: sessionId
        })
      }
    }

    return NextResponse.json({ hasSession: false })

  } catch (error) {
    console.error('Error checking anonymous session:', error)
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    )
  }
}