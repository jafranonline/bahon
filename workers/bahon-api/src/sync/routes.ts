// Cloud sync endpoints — opaque JSON snapshot per user in R2, optimistic
// version in D1. All Pro-gated. The backend never parses app data.

import { Hono } from 'hono'
import type { Env } from '../types'
import { requireAuth } from '../middleware/requireAuth'
import { requirePro, type ProVars } from '../middleware/requirePro'
import { getUserById, setUserDataVersion } from '../db'

const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024 // 5 MB

export const syncRoutes = new Hono<{ Bindings: Env; Variables: ProVars }>()

// Every sync route requires an authenticated, active-Pro user.
syncRoutes.use('*', requireAuth, requirePro)

const r2Key = (userId: string) => `users/${userId}/data.json`

// GET /api/sync → { version, snapshot, updatedAt }
syncRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const user = await getUserById(c.env.DB, userId)
  const obj = await c.env.BUCKET.get(r2Key(userId))
  const snapshot = obj ? JSON.parse(await obj.text()) : null
  return c.json({
    version: user?.data_version ?? 0,
    snapshot,
    updatedAt: user?.data_updated_at ?? null,
  })
})

// GET /api/sync/status → { version, updatedAt } (no blob)
syncRoutes.get('/status', async (c) => {
  const user = await getUserById(c.env.DB, c.get('userId'))
  return c.json({ version: user?.data_version ?? 0, updatedAt: user?.data_updated_at ?? null })
})

// POST /api/sync — { baseVersion, snapshot } → { version } | 409 { serverVersion }
syncRoutes.post('/', async (c) => {
  let body: { baseVersion?: unknown; snapshot?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  if (typeof body.baseVersion !== 'number') {
    return c.json({ error: 'invalid_base_version' }, 400)
  }
  if (body.snapshot === undefined || body.snapshot === null) {
    return c.json({ error: 'missing_snapshot' }, 400)
  }

  const serialized = JSON.stringify(body.snapshot)
  if (serialized.length > MAX_SNAPSHOT_BYTES) {
    return c.json({ error: 'snapshot_too_large' }, 413)
  }

  const userId = c.get('userId')
  const user = await getUserById(c.env.DB, userId)
  const current = user?.data_version ?? 0

  // Optimistic concurrency: only accept a push built on the current version.
  if (body.baseVersion !== current) {
    return c.json({ error: 'version_conflict', serverVersion: current }, 409)
  }

  await c.env.BUCKET.put(r2Key(userId), serialized)
  const version = current + 1
  await setUserDataVersion(c.env.DB, userId, version, new Date().toISOString())
  return c.json({ version })
})
