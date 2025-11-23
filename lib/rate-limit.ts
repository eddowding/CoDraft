import { kv } from '@vercel/kv'

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Rate limiter using Vercel KV (Redis)
 * Falls back to allowing requests if KV is not configured
 */
export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  // If KV is not configured, allow all requests (development mode)
  if (!process.env.KV_REST_API_URL) {
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + windowMs
    }
  }

  try {
    const key = `rate-limit:${identifier}`
    const now = Date.now()
    const windowStart = now - windowMs

    // Use a sorted set to track requests in the time window
    // Remove old entries outside the window
    await kv.zremrangebyscore(key, 0, windowStart)

    // Count requests in current window
    const count = await kv.zcard(key)

    if (count >= limit) {
      // Get the oldest entry to determine when the window resets
      const oldest = await kv.zrange(key, 0, 0, { withScores: true })
      const resetTime = oldest.length > 0
        ? (oldest[1] as number) + windowMs
        : now + windowMs

      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetTime
      }
    }

    // Add current request
    await kv.zadd(key, { score: now, member: `${now}:${Math.random()}` })

    // Set expiration on the key (cleanup)
    await kv.expire(key, Math.ceil(windowMs / 1000))

    return {
      success: true,
      limit,
      remaining: limit - (count + 1),
      reset: now + windowMs
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // On error, allow the request (fail open)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + windowMs
    }
  }
}
