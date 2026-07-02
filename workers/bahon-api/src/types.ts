// Shared Worker types.

/**
 * Cloudflare Email Service (Email Sending) binding — native transactional
 * email. Declared locally so we don't depend on the global `SendEmail` type
 * being present in the installed workers-types version.
 */
export interface SendEmailBinding {
  send(message: {
    to: string
    from: string
    subject: string
    html?: string
    text?: string
  }): Promise<void>
}

export interface Env {
  // Workers AI — Whisper STT + Llama agent.
  AI: Ai
  // D1 database — users, subscriptions, refresh tokens, email tokens.
  DB: D1Database
  // R2 bucket — one JSON snapshot per user for cloud sync.
  BUCKET: R2Bucket
  // Cloudflare Email Service — verification & password-reset emails.
  EMAIL: SendEmailBinding
  // Plain vars (wrangler [vars]).
  FROM_EMAIL: string // e.g. "Bahon <no-reply@bahon.jafran.online>"
  APP_ORIGIN: string // frontend base URL for email links, e.g. https://bahon.jafran.online
  // AI credit limits — optional overrides (defaults live in credits.ts).
  FREE_AI_CREDITS?: string // one-time grant for free users (default 500)
  FREE_AI_CREDITS_VALIDITY_DAYS?: string // free grant validity in days (default 30)
  PRO_AI_DAILY_CREDITS?: string // daily grant for Pro users (default 500)
  // Google Sign-In OAuth client id (expected audience of Google ID tokens).
  GOOGLE_CLIENT_ID: string
  // Secrets (set via `wrangler secret put`), populated in later tasks.
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD_HASH: string
  ADMIN_JWT_SECRET: string
}
