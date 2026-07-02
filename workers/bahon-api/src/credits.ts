// AI usage credits — single source of truth for granting, rolling, and
// debiting the per-user credit balance that meters every AI endpoint.
//
// Model: 1 credit ≈ 1 character of AI traffic (voice transcript characters,
// chat input characters, reply characters, vision extract characters).
//   Free users  → one-time grant (default 500) valid for 30 days.
//   Pro users   → a daily grant (default 500) that resets every UTC day.
// Limits are configurable via wrangler [vars] without a code change:
//   FREE_AI_CREDITS, FREE_AI_CREDITS_VALIDITY_DAYS, PRO_AI_DAILY_CREDITS.

import type { Env } from './types'

export type CreditPlan = 'free' | 'pro'

export interface CreditRow {
  user_id: string
  plan: string
  balance: number
  granted: number
  window_start: string
  expires_at: string | null
  free_granted_at: string | null
  updated_at: string
}

/** Snapshot returned to handlers and to the frontend. */
export interface CreditState {
  plan: CreditPlan
  /** Credits usable right now (0 when the window has expired). */
  balance: number
  /** Size of the current window's grant. */
  granted: number
  /** When the current window ends (pro: next UTC midnight; free: grant+30d). */
  expiresAt: string | null
}

function intVar(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export function freeCredits(env: Env): number {
  return intVar(env.FREE_AI_CREDITS, 500)
}

export function freeValidityDays(env: Env): number {
  return intVar(env.FREE_AI_CREDITS_VALIDITY_DAYS, 30)
}

export function proDailyCredits(env: Env): number {
  return intVar(env.PRO_AI_DAILY_CREDITS, 500)
}

function nextUtcMidnight(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return d.toISOString()
}

function expired(row: { expires_at: string | null }, now: Date): boolean {
  return row.expires_at != null && row.expires_at <= now.toISOString()
}

async function getRow(db: D1Database, userId: string): Promise<CreditRow | null> {
  return db.prepare('SELECT * FROM ai_credits WHERE user_id = ?').bind(userId).first<CreditRow>()
}

async function putRow(db: D1Database, row: CreditRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_credits (user_id, plan, balance, granted, window_start, expires_at, free_granted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         plan = excluded.plan,
         balance = excluded.balance,
         granted = excluded.granted,
         window_start = excluded.window_start,
         expires_at = excluded.expires_at,
         free_granted_at = excluded.free_granted_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      row.user_id,
      row.plan,
      row.balance,
      row.granted,
      row.window_start,
      row.expires_at,
      row.free_granted_at,
      row.updated_at,
    )
    .run()
}

/**
 * Loads the user's credit window, granting or rolling it as needed:
 *  - Pro: a fresh daily window whenever the stored one is stale or the user
 *    just became Pro.
 *  - Free: the one-time grant on first use (never re-granted — the
 *    `free_granted_at` marker survives plan changes); an expired window
 *    reports balance 0.
 */
export async function getCreditState(
  db: D1Database,
  env: Env,
  userId: string,
  isPro: boolean,
  now: Date = new Date(),
): Promise<CreditState> {
  const nowIso = now.toISOString()
  const row = await getRow(db, userId)

  if (isPro) {
    // Roll to a fresh daily window when: no row yet, the user just became
    // Pro (plan flip), or the stored pro window has ended.
    if (!row || row.plan !== 'pro' || expired(row, now)) {
      const granted = proDailyCredits(env)
      const fresh: CreditRow = {
        user_id: userId,
        plan: 'pro',
        balance: granted,
        granted,
        window_start: nowIso,
        expires_at: nextUtcMidnight(now),
        free_granted_at: row?.free_granted_at ?? null,
        updated_at: nowIso,
      }
      await putRow(db, fresh)
      return { plan: 'pro', balance: granted, granted, expiresAt: fresh.expires_at }
    }
    return { plan: 'pro', balance: row.balance, granted: row.granted, expiresAt: row.expires_at }
  }

  // Free plan. Issue the one-time grant on first use only.
  if (!row || (row.free_granted_at == null && row.plan !== 'free')) {
    const granted = freeCredits(env)
    const expiresAt = new Date(
      now.getTime() + freeValidityDays(env) * 24 * 60 * 60 * 1000,
    ).toISOString()
    const fresh: CreditRow = {
      user_id: userId,
      plan: 'free',
      balance: granted,
      granted,
      window_start: nowIso,
      expires_at: expiresAt,
      free_granted_at: nowIso,
      updated_at: nowIso,
    }
    await putRow(db, fresh)
    return { plan: 'free', balance: granted, granted, expiresAt }
  }

  // A lapsed-Pro user falls back to whatever remains of the free grant.
  // Their row still says plan 'pro'; report it as the free view without
  // re-granting (free_granted_at != null means the grant was consumed).
  if (row.plan !== 'free') {
    return { plan: 'free', balance: 0, granted: 0, expiresAt: null }
  }

  const balance = expired(row, now) ? 0 : row.balance
  return { plan: 'free', balance, granted: row.granted, expiresAt: row.expires_at }
}

/**
 * Debits `amount` credits (floored at 0) and returns the new balance. The
 * last request in a window may cost more than the remaining balance — that
 * overrun is intentionally absorbed rather than rejecting mid-conversation.
 */
export async function debitCredits(
  db: D1Database,
  userId: string,
  amount: number,
): Promise<number> {
  const spend = Math.max(1, Math.round(amount))
  const row = await db
    .prepare(
      `UPDATE ai_credits
       SET balance = MAX(0, balance - ?), updated_at = ?
       WHERE user_id = ?
       RETURNING balance`,
    )
    .bind(spend, new Date().toISOString(), userId)
    .first<{ balance: number }>()
  return row?.balance ?? 0
}
