import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

// Client-side Supabase client
export function createClientSupabase() {
  return createClientComponentClient<Database>()
}

// Server-side Supabase client
export function createServerSupabase() {
  return createServerComponentClient<Database>({ cookies })
}

// Service role client (for admin operations)
export function createServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}