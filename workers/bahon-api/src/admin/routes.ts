// Admin API — user & subscription management. Separate admin auth (not user JWT).

import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import type { Env } from '../types'
import { verifyPassword } from '../auth/crypto'
import { requireAdmin, type AdminVars } from '../middleware/requireAdmin'
import {
  listUsers,
  countUsers,
  adminStats,
  getUserById,
  getSubscription,
  upsertSubscription,
  deleteUserCascade,
} from '../db'

const PAGE_SIZE = 20
const ADMIN_TTL_SECONDS = 8 * 60 * 60 // 8 hours

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AdminVars }>()

adminRoutes.post('/login', async (c) => {
  let body: { username?: unknown; password?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const [salt, hash] = (c.env.ADMIN_PASSWORD_HASH ?? '').split(':')
  const ok =
    username === c.env.ADMIN_USERNAME &&
    !!salt &&
    !!hash &&
    (await verifyPassword(password, hash, salt))
  if (!ok) return c.json({ error: 'invalid_credentials' }, 401)

  const now = Math.floor(Date.now() / 1000)
  const token = await sign(
    { sub: username, role: 'admin', iat: now, exp: now + ADMIN_TTL_SECONDS },
    c.env.ADMIN_JWT_SECRET,
    'HS256',
  )
  return c.json({ token })
})

// All routes below require a valid admin token.
adminRoutes.use('/users', requireAdmin)
adminRoutes.use('/users/*', requireAdmin)
adminRoutes.use('/stats', requireAdmin)

adminRoutes.get('/users', async (c) => {
  const query = c.req.query('query') ?? ''
  const page = Math.max(1, Number(c.req.query('page') ?? '1') || 1)
  const offset = (page - 1) * PAGE_SIZE
  const [users, total] = await Promise.all([
    listUsers(c.env.DB, query, PAGE_SIZE, offset),
    countUsers(c.env.DB, query),
  ])
  return c.json({ users, total, page, pageSize: PAGE_SIZE })
})

adminRoutes.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await getUserById(c.env.DB, id)
  if (!user) return c.json({ error: 'not_found' }, 404)
  const subscription = await getSubscription(c.env.DB, id)
  return c.json({ user, subscription })
})

adminRoutes.post('/users/:id/subscription', async (c) => {
  const id = c.req.param('id')
  const user = await getUserById(c.env.DB, id)
  if (!user) return c.json({ error: 'not_found' }, 404)
  let body: { tier?: unknown; status?: unknown; expiresAt?: unknown; notes?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  const tier = body.tier === 'pro' ? 'pro' : 'free'
  const status =
    body.status === 'expired' || body.status === 'cancelled' ? body.status : 'active'
  await upsertSubscription(c.env.DB, id, {
    tier,
    status,
    source: 'manual',
    startedAt: new Date().toISOString(),
    expiresAt: typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
  })
  return c.json({ ok: true, subscription: await getSubscription(c.env.DB, id) })
})

adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id')
  // Remove the user's sync blob, then cascade-delete D1 rows.
  await c.env.BUCKET.delete(`users/${id}/data.json`)
  await deleteUserCascade(c.env.DB, id)
  return c.json({ ok: true })
})

adminRoutes.get('/stats', async (c) => {
  return c.json(await adminStats(c.env.DB))
})
