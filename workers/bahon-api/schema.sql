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
  data_updated_at TEXT
);

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
