// Auth endpoints: register, login, refresh, logout, me.

import { Hono } from 'hono'
import type { Env } from '../types'
import { hashPassword, verifyPassword, sha256, randomToken } from './crypto'
import { signAccessToken } from './jwt'
import { requireAuth, type AuthVars } from '../middleware/requireAuth'
import { entitlements } from '../subscription'
import {
  getUserByEmail,
  getUserById,
  createUser,
  getSubscription,
  upsertSubscription,
  createRefreshToken,
  getRefreshTokenByHash,
  revokeRefreshToken,
  type UserRow,
} from '../db'

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const authRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>()

interface AuthBody {
  email?: unknown
  password?: unknown
  displayName?: unknown
  refreshToken?: unknown
}

function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    createdAt: u.created_at,
  }
}

/** Issues an access token and a rotating refresh token (stored hashed). */
async function issueTokens(env: Env, userId: string) {
  const accessToken = await signAccessToken(userId, env)
  const refreshToken = randomToken()
  await createRefreshToken(env.DB, {
    id: crypto.randomUUID(),
    userId,
    tokenHash: await sha256(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
  })
  return { accessToken, refreshToken }
}

authRoutes.post('/register', async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : null

  if (!EMAIL_RE.test(email)) return c.json({ error: 'invalid_email' }, 400)
  if (password.length < 8) return c.json({ error: 'weak_password' }, 400)
  if (await getUserByEmail(c.env.DB, email)) return c.json({ error: 'email_taken' }, 409)

  const { hash, salt } = await hashPassword(password)
  const id = crypto.randomUUID()
  await createUser(c.env.DB, {
    id,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    displayName,
  })
  await upsertSubscription(c.env.DB, id, {
    tier: 'free',
    status: 'active',
    source: 'manual',
    startedAt: new Date().toISOString(),
  })

  const tokens = await issueTokens(c.env, id)
  const user = await getUserById(c.env.DB, id)
  return c.json({ ...tokens, user: user ? publicUser(user) : null })
})

authRoutes.post('/login', async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const user = await getUserByEmail(c.env.DB, email)
  const ok =
    user?.password_hash != null &&
    user.password_salt != null &&
    (await verifyPassword(password, user.password_hash, user.password_salt))
  // Generic message either way — no user enumeration.
  if (!ok || !user) return c.json({ error: 'invalid_credentials' }, 401)

  const tokens = await issueTokens(c.env, user.id)
  return c.json({ ...tokens, user: publicUser(user) })
})

authRoutes.post('/refresh', async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''
  if (!refreshToken) return c.json({ error: 'invalid_token' }, 401)

  const row = await getRefreshTokenByHash(c.env.DB, await sha256(refreshToken))
  if (!row || row.revoked_at || row.expires_at < new Date().toISOString()) {
    return c.json({ error: 'invalid_token' }, 401)
  }
  await revokeRefreshToken(c.env.DB, row.id) // rotate: single-use
  const tokens = await issueTokens(c.env, row.user_id)
  return c.json(tokens)
})

authRoutes.post('/logout', async (c) => {
  let body: AuthBody = {}
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    // tolerate empty/invalid body
  }
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''
  if (refreshToken) {
    const row = await getRefreshTokenByHash(c.env.DB, await sha256(refreshToken))
    if (row && !row.revoked_at) await revokeRefreshToken(c.env.DB, row.id)
  }
  return c.json({ ok: true })
})

authRoutes.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId')
  const user = await getUserById(c.env.DB, userId)
  if (!user) return c.json({ error: 'not_found' }, 404)
  const subscription = await getSubscription(c.env.DB, userId)
  return c.json({ user: publicUser(user), subscription, entitlements: entitlements(subscription) })
})
