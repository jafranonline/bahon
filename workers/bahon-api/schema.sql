-- Bahon API D1 schema (Phase 15: accounts, sync, subscriptions).

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,            -- uuid
  email           TEXT NOT NULL UNIQUE,        -- lowercased
  password_hash   TEXT,                        -- PBKDF2 (nullable for future OAuth-only)
  password_salt   TEXT,                        -- per-user random
  oauth_provider  TEXT,                        -- null now; 'google'|'apple' later
  oauth_sub       TEXT,                        -- provider subject id, later
  display_name    TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  data_version    INTEGER NOT NULL DEFAULT 0,
  data_updated_at TEXT,
  email_verified_at TEXT                       -- null = unverified
);

-- Single-use, hashed, expiring tokens delivered by email:
-- account verification, password reset, and email-change confirmation.
CREATE TABLE IF NOT EXISTS email_tokens (
  id          TEXT PRIMARY KEY,               -- uuid
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,                  -- SHA-256 of the opaque token
  purpose     TEXT NOT NULL,                  -- 'verify_email' | 'reset_password' | 'change_email'
  new_email   TEXT,                           -- target address for 'change_email'
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_hash ON email_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id, purpose);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier       TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'pro'
  status     TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'cancelled'
  source     TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'stripe' (future)
  started_at TEXT,
  expires_at TEXT,                            -- null = no expiry
  notes      TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY,               -- uuid
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,                  -- SHA-256 of opaque token
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- AI usage credits (1 credit ≈ 1 character of AI input/output). Free users get
-- a one-time grant valid for 30 days; Pro users a daily grant reset each UTC
-- day. Limits configurable via wrangler vars (src/credits.ts).
CREATE TABLE IF NOT EXISTS ai_credits (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL,             -- 'free' | 'pro' — plan of the current window
  balance         INTEGER NOT NULL,          -- credits remaining in the current window
  granted         INTEGER NOT NULL,          -- size of the current window's grant
  window_start    TEXT NOT NULL,             -- ISO timestamp the window began
  expires_at      TEXT,                      -- window end (free: grant+validity; pro: next UTC midnight)
  free_granted_at TEXT,                      -- set once: when the one-time free grant was issued
  updated_at      TEXT NOT NULL
);
