import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// Ensure no caching of auth check
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ADMIN_EMAIL = 'me@eddowding.com'

function isAdmin(email: string | undefined): boolean {
  return email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    return NextResponse.json({
      isAdmin: isAdmin(user.email),
      user: user.email
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
