// Hono middleware: requires a valid Bearer access token; sets `userId`.

import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import { verifyAccessToken } from '../auth/jwt'

export type AuthVars = { userId: string }

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthVars }>(
  async (c, next) => {
    const header = c.req.header('Authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const userId = await verifyAccessToken(token, c.env)
    if (!userId) return c.json({ error: 'unauthorized' }, 401)
    c.set('userId', userId)
    return next()
  },
)
