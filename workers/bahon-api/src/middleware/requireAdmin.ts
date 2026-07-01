// Hono middleware: requires a valid admin JWT (claim role='admin'), signed with
// ADMIN_JWT_SECRET (separate from user tokens).

import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { Env } from '../types'

export type AdminVars = { adminUser: string }

export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: AdminVars }>(
  async (c, next) => {
    const header = c.req.header('Authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return c.json({ error: 'unauthorized' }, 401)
    try {
      const payload = await verify(token, c.env.ADMIN_JWT_SECRET, 'HS256')
      if (payload.role !== 'admin' || typeof payload.sub !== 'string') {
        return c.json({ error: 'forbidden' }, 403)
      }
      c.set('adminUser', payload.sub)
      return next()
    } catch {
      return c.json({ error: 'unauthorized' }, 401)
    }
  },
)
