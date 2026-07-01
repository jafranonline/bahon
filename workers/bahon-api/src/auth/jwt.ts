// Access-token signing/verification (HS256) via hono/jwt.

import { sign, verify } from 'hono/jwt'
import type { Env } from '../types'

const ACCESS_TTL_SECONDS = 15 * 60 // 15 minutes

export async function signAccessToken(userId: string, env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    { sub: userId, type: 'access', iat: now, exp: now + ACCESS_TTL_SECONDS },
    env.JWT_SECRET,
    'HS256',
  )
}

/** Verifies an access token; returns the user id or null if invalid/expired. */
export async function verifyAccessToken(token: string, env: Env): Promise<string | null> {
  if (!token) return null
  try {
    const payload = await verify(token, env.JWT_SECRET, 'HS256')
    if (payload.type !== 'access' || typeof payload.sub !== 'string') return null
    return payload.sub
  } catch {
    return null
  }
}
