// Hono middleware: requires an active Pro subscription. Runs AFTER requireAuth
// (needs `userId`). Sets `subscription` on success.

import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import type { AuthVars } from './requireAuth'
import { getSubscription, type SubscriptionRow } from '../db'
import { isProActive } from '../subscription'

export type ProVars = AuthVars & { subscription: SubscriptionRow }

export const requirePro = createMiddleware<{ Bindings: Env; Variables: ProVars }>(
  async (c, next) => {
    const userId = c.get('userId')
    const sub = await getSubscription(c.env.DB, userId)
    if (!sub || !isProActive(sub)) return c.json({ error: 'pro_required' }, 403)
    c.set('subscription', sub)
    return next()
  },
)
