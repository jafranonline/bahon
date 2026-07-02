// Hono middleware: requires a positive AI-credit balance. Runs AFTER
// requireAuth (needs `userId`). Any signed-in user may use the AI endpoints;
// free users spend their one-time grant, Pro users their daily grant.
// Sets `credits` (the pre-request state) on success; handlers debit actual
// usage via debitCredits after the AI call completes.

import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import type { AuthVars } from './requireAuth'
import { getSubscription } from '../db'
import { isProActive } from '../subscription'
import { getCreditState, type CreditState } from '../credits'

export type CreditVars = AuthVars & { credits: CreditState }

export const requireCredits = createMiddleware<{ Bindings: Env; Variables: CreditVars }>(
  async (c, next) => {
    const userId = c.get('userId')
    const sub = await getSubscription(c.env.DB, userId)
    const credits = await getCreditState(c.env.DB, c.env, userId, isProActive(sub))
    if (credits.balance <= 0) {
      return c.json({ error: 'no_credits', credits }, 402)
    }
    c.set('credits', credits)
    return next()
  },
)
