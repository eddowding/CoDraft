import { z } from 'zod'

/**
 * Environment variable validation schema
 * Validates required and optional environment variables at runtime
 */

// Schema for client-side (public) environment variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),
})

// Schema for server-side environment variables
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY is required for server operations',
  }),
  // Optional environment variables
  OPENROUTER_API_KEY: z.string().optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
})

// Combined schema for all environment variables
const envSchema = clientEnvSchema.merge(serverEnvSchema.partial())

// Type definitions
export type ClientEnv = z.infer<typeof clientEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type Env = z.infer<typeof envSchema>

/**
 * Validated client environment variables
 * Safe to use in client-side code
 */
export function getClientEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
    throw new Error(`Missing or invalid client environment variables:\n${errors}`)
  }

  return result.data
}

/**
 * Validated server environment variables
 * Only use in server-side code (API routes, server components)
 */
export function getServerEnv(): Partial<ServerEnv> & ClientEnv {
  // In client context, only return client env
  if (typeof window !== 'undefined') {
    return getClientEnv() as Partial<ServerEnv> & ClientEnv
  }

  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  })

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
    console.error(`Environment validation warnings:\n${errors}`)
    // Don't throw - allow partial validation for optional vars
  }

  return result.data as Partial<ServerEnv> & ClientEnv
}

/**
 * Check if AI features are available
 */
export function isAIEnabled(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

/**
 * Check if rate limiting (Vercel KV) is available
 */
export function isRateLimitingEnabled(): boolean {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
}

/**
 * Validate environment on startup (call this in layout.tsx or middleware)
 * Returns true if all required variables are present
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check client env
  const clientResult = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!clientResult.success) {
    errors.push(...clientResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`))
  }

  // Check server env (only on server)
  if (typeof window === 'undefined') {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY: Required for server operations')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
