import { NextRequest, NextResponse } from 'next/server'
import { createClientSupabase } from '@/lib/supabase'
import { randomBytes, createHash } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientSupabase()

    // CRITICAL: Check for existing session cookie FIRST
    const existingSessionId = request.cookies.get('anonymous_session')?.value

    if (existingSessionId) {
      // Verify the session exists in database
      const { data: existingSession, error: verifyError } = await supabase
        .from('anonymous_sessions')
        .select('*')
        .eq('session_id', existingSessionId)
        .single()

      if (existingSession && !verifyError) {
        // Update last_seen
        await supabase
          .from('anonymous_sessions')
          .update({ last_seen: new Date().toISOString() })
          .eq('session_id', existingSessionId)

        // Return existing session - DON'T CREATE A NEW ONE!
        return NextResponse.json({
          success: true,
          sessionId: existingSessionId,
          email: existingSession.email,
          emailVerified: existingSession.email_verified || false
        })
      }
      // If session doesn't exist in DB, cookie is stale - will create new one below
    }

    // Only create new session if no valid existing session
    const sessionId = randomBytes(16).toString('hex')

    // Get client information
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const rawIpAddress = forwardedFor?.split(',')[0] || realIP || request.ip || 'unknown'

    // Hash IP address for privacy (GDPR compliance)
    const ipHash = rawIpAddress !== 'unknown'
      ? createHash('sha256')
          .update(rawIpAddress + (process.env.IP_SALT || 'default-salt'))
          .digest('hex')
      : null

    // Get fingerprint and email from request body
    const body = await request.json().catch(() => ({}))
    const fingerprintHash = body.fingerprint || null
    const email = body.email || null

    // Create new anonymous session
    const sessionData: any = {
      session_id: sessionId,
      ip_hash: ipHash,
      user_agent: userAgent,
      fingerprint_hash: fingerprintHash
    }

    // Only add email fields if email is provided
    if (email) {
      // Check if email already has a session
      const { data: existingEmailSession } = await supabase
        .from('anonymous_sessions')
        .select('*')
        .eq('email', email)
        .single()

      if (existingEmailSession) {
        // Return existing session for this email
        const response = NextResponse.json({
          success: true,
          sessionId: existingEmailSession.session_id,
          emailExists: true,
          emailVerified: existingEmailSession.email_verified
        })

        // Update cookie to match the existing session
        response.cookies.set('anonymous_session', existingEmailSession.session_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
          path: '/'
        })

        return response
      }

      sessionData.email = email
      sessionData.email_verified = false
    }

    const { data, error } = await supabase
      .from('anonymous_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      sessionId: sessionId,
      email: email,
      emailVerified: false
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
        .select('session_id, email, email_verified')
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
          sessionId: sessionId,
          email: data.email,
          emailVerified: data.email_verified
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