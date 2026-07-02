-- AI usage credits: 1 credit ≈ 1 character of AI input/output (voice
-- transcripts, chat input, chat replies, vision extracts).
-- Free users get a one-time grant (default 500) valid for 30 days.
-- Pro users get a daily grant (default 500) that resets every UTC day.
-- Limits are configurable via wrangler vars (see src/credits.ts).

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
