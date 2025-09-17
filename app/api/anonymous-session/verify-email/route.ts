import { NextRequest, NextResponse } from 'next/server'
import { createClientSupabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'

// Send verification email
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientSupabase()
    const body = await request.json()
    const { email, sessionId } = body

    if (!email || !sessionId) {
      return NextResponse.json(
        { error: 'Email and session ID required' },
        { status: 400 }
      )
    }

    // Generate verification token
    const token = randomBytes(32).toString('hex')

    // Create verification record
    const { error } = await supabase
      .from('email_verifications')
      .insert({
        email: email,
        token: token,
        session_id: sessionId
      })

    if (error) {
      throw error
    }

    // In production, send email with verification link
    // For now, just return the token (in production, remove this)
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/anonymous-session/verify-email?token=${token}`

    // TODO: Implement actual email sending using Resend or similar service
    console.log('Verification URL:', verificationUrl)

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
      // Remove in production - just for testing
      verificationUrl: process.env.NODE_ENV === 'development' ? verificationUrl : undefined
    })

  } catch (error) {
    console.error('Error sending verification email:', error)
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}

// Verify email with token
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientSupabase()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      )
    }

    // Get verification record
    const { data: verification, error: verifyError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .single()

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Check if already verified
    if (verification.verified_at) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified'
      })
    }

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 400 }
      )
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('token', token)

    if (updateError) {
      throw updateError
    }

    // Update anonymous session
    if (verification.session_id) {
      await supabase
        .from('anonymous_sessions')
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString()
        })
        .eq('session_id', verification.session_id)
    }

    // Update all votes from this email to be verified
    await supabase
      .from('votes')
      .update({ email_verified: true })
      .eq('email', verification.email)

    // Redirect to success page or return JSON
    if (request.headers.get('accept')?.includes('text/html')) {
      // Redirect to a success page
      const url = new URL('/public/email-verified', request.url)
      return NextResponse.redirect(url)
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    })

  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}