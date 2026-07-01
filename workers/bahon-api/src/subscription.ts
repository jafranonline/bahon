// Subscription entitlement logic — single source of truth for "is Pro active".

import type { SubscriptionRow } from './db'

/** A subscription grants Pro when tier=pro, status=active, and either no
 * expiry or an expiry still in the future. */
export function isProActive(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub) return false
  if (sub.tier !== 'pro' || sub.status !== 'active') return false
  if (sub.expires_at != null && sub.expires_at <= now.toISOString()) return false
  return true
}

/** Entitlements block returned to the frontend (single source of truth). */
export function entitlements(sub: SubscriptionRow | null): { pro: boolean; expiresAt: string | null } {
  return { pro: isProActive(sub), expiresAt: sub?.expires_at ?? null }
}
