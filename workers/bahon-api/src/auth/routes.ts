// Auth endpoints: register, login, refresh, logout, me, plus email
// verification, password recovery, and email change.

import { Hono } from 'hono'
import type { Env } from '../types'
import { hashPassword, verifyPassword, sha256, randomToken } from './crypto'
import { signAccessToken } from './jwt'
import { requireAuth, type AuthVars } from '../middleware/requireAuth'
import { entitlements } from '../subscription'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeEmail,
} from '../email'
import { verifyGoogleIdToken } from './google'
import {
  getUserByEmail,
  getUserById,
  createUser,
  getUserByOauth,
  linkOauthToUser,
  getSubscription,
  upsertSubscription,
  createRefreshToken,
  getRefreshTokenByHash,
  revokeRefreshToken,
  createEmailToken,
  getEmailTokenByHash,
  consumeEmailToken,
  hasRecentEmailToken,
  setUserEmailVerified,
  updateUserPassword,
  updateUserEmail,
  updateUserDisplayName,
  revokeAllRefreshTokens,
  type UserRow,
  type EmailTokenPurpose,
} from '../db'

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour
const RESEND_THROTTLE_MS = 60 * 1000 // one email per minute per purpose
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const authRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>()

interface AuthBody {
  email?: unknown
  password?: unknown
  displayName?: unknown
  refreshToken?: unknown
  token?: unknown
  newPassword?: unknown
  newEmail?: unknown
}

function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    createdAt: u.created_at,
    emailVerified: u.email_verified_at != null,
  }
}

/**
 * Mints a hashed email token and emails the corresponding link. Best-effort:
 * throttled per user+purpose, and delivery failures are swallowed by the
 * caller (via waitUntil) so they never break the request.
 */
async function issueEmailToken(
  env: Env,
  opts: {
    userId: string
    email: string
    purpose: EmailTokenPurpose
    ttlMs: number
    newEmail?: string
  },
): Promise<void> {
  if (await hasRecentEmailToken(env.DB, opts.userId, opts.purpose, RESEND_THROTTLE_MS)) return
  const token = randomToken()
  await createEmailToken(env.DB, {
    id: crypto.randomUUID(),
    userId: opts.userId,
    tokenHash: await sha256(token),
    purpose: opts.purpose,
    newEmail: opts.newEmail ?? null,
    expiresAt: new Date(Date.now() + opts.ttlMs).toISOString(),
  })
  const to = opts.newEmail ?? opts.email
  if (opts.purpose === 'verify_email') await sendVerificationEmail(env, to, token)
  else if (opts.purpose === 'reset_password') await sendPasswordResetEmail(env, to, token)
  else await sendEmailChangeEmail(env, to, token)
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

  // Fire-and-forget verification email — never blocks or fails registration.
  c.executionCtx.waitUntil(
    issueEmailToken(c.env, { userId: id, email, purpose: 'verify_email', ttlMs: VERIFY_TTL_MS })
      .catch((err) => console.error('verify email send failed', err)),
  )

  const tokens = await issueTokens(c.env, id)
  const user = await getUserById(c.env.DB, id)
  return c.json({ ...tokens, user: user ? publicUser(user) : null })
})

// ---- Email verification ----

/** Confirm an email via the token from the verification link. */
authRoutes.post('/verify-email', async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) return c.json({ error: 'invalid_token' }, 400)

  const row = await getEmailTokenByHash(c.env.DB, await sha256(token))
  if (
    !row ||
    row.consumed_at ||
    row.expires_at < new Date().toISOString() ||
    (row.purpose !== 'verify_email' && row.purpose !== 'change_email')
  ) {
    return c.json({ error: 'invalid_token' }, 400)
  }

  // 'change_email' tokens carry the new address; apply it, else just verify.
  if (row.purpose === 'change_email' && row.new_email) {
    // Guard against the address being claimed between request and confirm.
    const existing = await getUserByEmail(c.env.DB, row.new_email)
    if (existing && existing.id !== row.user_id) return c.json({ error: 'email_taken' }, 409)
    await updateUserEmail(c.env.DB, row.user_id, row.new_email)
  } else {
    await setUserEmailVerified(c.env.DB, row.user_id)
  }
  await consumeEmailToken(c.env.DB, row.id)
  return c.json({ ok: true })
})

/** Resend the verification email to the logged-in user. */
authRoutes.post('/resend-verification', requireAuth, async (c) => {
  const userId = c.get('userId')
  const user = await getUserById(c.env.DB, userId)
  if (!user) return c.json({ error: 'not_found' }, 404)
  if (user.email_verified_at) return c.json({ ok: true, alreadyVerified: true })
  c.executionCtx.waitUntil(
    issueEmailToken(c.env, {
      userId: user.id,
      email: user.email,
      purpose: 'verify_email',
      ttlMs: VERIFY_TTL_MS,
    }).catch((err) => console.error('resend verify failed', err)),
  )
  return c.json({ ok: true })
})

// ---- Password recovery ----

/** Start a reset. Always 200 (no account enumeration). */
authRoutes.post('/forgot-password', async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (EMAIL_RE.test(email)) {
    const user = await getUserByEmail(c.env.DB, email)
    if (user) {
      c.executionCtx.waitUntil(
        issueEmailToken(c.env, {
          userId: user.id,
          email: user.email,
          purpose: 'reset_password',
          ttlMs: RESET_TTL_MS,
        }).catch((err) => console.error('reset email send failed', err)),
      )
    }
  }
  return c.json({ ok: true })
})

/** Complete a reset: set a new password and kill all existing sessions. */
authRoutes.post('/reset-password', async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const token = typeof body.token === 'string' ? body.token : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (!token) return c.json({ error: 'invalid_token' }, 400)
  if (newPassword.length < 8) return c.json({ error: 'weak_password' }, 400)

  const row = await getEmailTokenByHash(c.env.DB, await sha256(token))
  if (
    !row ||
    row.consumed_at ||
    row.expires_at < new Date().toISOString() ||
    row.purpose !== 'reset_password'
  ) {
    return c.json({ error: 'invalid_token' }, 400)
  }

  const { hash, salt } = await hashPassword(newPassword)
  await updateUserPassword(c.env.DB, row.user_id, hash, salt)
  await consumeEmailToken(c.env.DB, row.id)
  await revokeAllRefreshTokens(c.env.DB, row.user_id) // force re-login everywhere
  // A verified reset also proves ownership of the address.
  await setUserEmailVerified(c.env.DB, row.user_id)
  return c.json({ ok: true })
})

// ---- Profile (authenticated) ----

/** Update the display name shown in the app. */
authRoutes.patch('/profile', requireAuth, async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const userId = c.get('userId')
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  if (!displayName) return c.json({ error: 'invalid_name' }, 400)
  if (displayName.length > 80) return c.json({ error: 'invalid_name' }, 400)

  await updateUserDisplayName(c.env.DB, userId, displayName)
  const user = await getUserById(c.env.DB, userId)
  if (!user) return c.json({ error: 'not_found' }, 404)
  return c.json({ user: publicUser(user) })
})

// ---- Email change (authenticated) ----

/** Request an email change; confirmation link is sent to the NEW address. */
authRoutes.post('/change-email', requireAuth, async (c) => {
  let body: AuthBody
  try {
    body = await c.req.json<AuthBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const userId = c.get('userId')
  const newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!EMAIL_RE.test(newEmail)) return c.json({ error: 'invalid_email' }, 400)

  const user = await getUserById(c.env.DB, userId)
  if (!user) return c.json({ error: 'not_found' }, 404)
  // Re-authenticate: changing the login identity requires the current password.
  const ok =
    user.password_hash != null &&
    user.password_salt != null &&
    (await verifyPassword(password, user.password_hash, user.password_salt))
  if (!ok) return c.json({ error: 'invalid_credentials' }, 401)
  if (newEmail === user.email) return c.json({ error: 'same_email' }, 400)
  if (await getUserByEmail(c.env.DB, newEmail)) return c.json({ error: 'email_taken' }, 409)

  c.executionCtx.waitUntil(
    issueEmailToken(c.env, {
      userId: user.id,
      email: user.email,
      purpose: 'change_email',
      ttlMs: VERIFY_TTL_MS,
      newEmail,
    }).catch((err) => console.error('change email send failed', err)),
  )
  return c.json({ ok: true })
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

/**
 * Google Sign-In. Accepts a Google ID token (GIS credential). Signs in the
 * matching account, links Google to an existing email account, or creates a
 * new account — one button serves login and registration.
 */
authRoutes.post('/google', async (c) => {
  let body: AuthBody & { credential?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const credential = typeof body.credential === 'string' ? body.credential : ''
  if (!credential) return c.json({ error: 'invalid_token' }, 400)
  if (!c.env.GOOGLE_CLIENT_ID) return c.json({ error: 'not_configured' }, 501)

  const identity = await verifyGoogleIdToken(credential, c.env.GOOGLE_CLIENT_ID)
  if (!identity) return c.json({ error: 'invalid_token' }, 401)

  let user = await getUserByOauth(c.env.DB, 'google', identity.sub)
  if (!user) {
    // Connect to an existing email/password account with the same address —
    // only if Google attests the address (otherwise account takeover risk).
    const byEmail = identity.emailVerified
      ? await getUserByEmail(c.env.DB, identity.email)
      : null
    if (byEmail) {
      await linkOauthToUser(c.env.DB, byEmail.id, 'google', identity.sub)
      user = await getUserById(c.env.DB, byEmail.id)
    } else {
      const id = crypto.randomUUID()
      await createUser(c.env.DB, {
        id,
        email: identity.email,
        passwordHash: null,
        passwordSalt: null,
        displayName: identity.name,
        oauthProvider: 'google',
        oauthSub: identity.sub,
        emailVerified: identity.emailVerified,
      })
      await upsertSubscription(c.env.DB, id, {
        tier: 'free',
        status: 'active',
        source: 'manual',
        startedAt: new Date().toISOString(),
      })
      user = await getUserById(c.env.DB, id)
    }
  }
  if (!user) return c.json({ error: 'not_found' }, 404)

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
