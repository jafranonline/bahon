// Shared Worker types.

export interface Env {
  // Workers AI — Whisper STT + Llama agent.
  AI: Ai
  // D1 database — users, subscriptions, refresh tokens.
  DB: D1Database
  // R2 bucket — one JSON snapshot per user for cloud sync.
  BUCKET: R2Bucket
  // Secrets (set via `wrangler secret put`), populated in later tasks.
  JWT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD_HASH: string
  ADMIN_JWT_SECRET: string
}
