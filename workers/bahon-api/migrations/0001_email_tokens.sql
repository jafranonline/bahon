-- Migration: email verification & password recovery (TASK-069).
-- Apply to the existing bahon-db:
--   wrangler d1 execute bahon-db --remote --file=migrations/0001_email_tokens.sql
-- (drop --remote to run against the local dev DB first).

ALTER TABLE users ADD COLUMN email_verified_at TEXT;

CREATE TABLE IF NOT EXISTS email_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  new_email   TEXT,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_hash ON email_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id, purpose);
