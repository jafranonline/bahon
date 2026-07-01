// Typed helpers over the D1 database.

export interface UserRow {
  id: string
  email: string
  password_hash: string | null
  password_salt: string | null
  oauth_provider: string | null
  oauth_sub: string | null
  display_name: string | null
  created_at: string
  updated_at: string
  data_version: number
  data_updated_at: string | null
  email_verified_at: string | null
}

export interface SubscriptionRow {
  user_id: string
  tier: string
  status: string
  source: string
  started_at: string | null
  expires_at: string | null
  notes: string | null
  updated_at: string
}

export interface RefreshTokenRow {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  created_at: string
  revoked_at: string | null
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<UserRow>()
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
}

export interface NewUser {
  id: string
  email: string
  passwordHash: string | null
  passwordSalt: string | null
  displayName?: string | null
}

export async function createUser(db: D1Database, u: NewUser): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, display_name, created_at, updated_at, data_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .bind(u.id, u.email.toLowerCase(), u.passwordHash, u.passwordSalt, u.displayName ?? null, now, now)
    .run()
}

export async function setUserDataVersion(
  db: D1Database,
  userId: string,
  version: number,
  updatedAt: string,
): Promise<void> {
  await db
    .prepare('UPDATE users SET data_version = ?, data_updated_at = ?, updated_at = ? WHERE id = ?')
    .bind(version, updatedAt, new Date().toISOString(), userId)
    .run()
}

export async function getSubscription(
  db: D1Database,
  userId: string,
): Promise<SubscriptionRow | null> {
  return db
    .prepare('SELECT * FROM subscriptions WHERE user_id = ?')
    .bind(userId)
    .first<SubscriptionRow>()
}

export interface SubscriptionPatch {
  tier?: string
  status?: string
  source?: string
  startedAt?: string | null
  expiresAt?: string | null
  notes?: string | null
}

export async function upsertSubscription(
  db: D1Database,
  userId: string,
  patch: SubscriptionPatch,
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO subscriptions (user_id, tier, status, source, started_at, expires_at, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         tier = excluded.tier,
         status = excluded.status,
         source = excluded.source,
         started_at = excluded.started_at,
         expires_at = excluded.expires_at,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      patch.tier ?? 'free',
      patch.status ?? 'active',
      patch.source ?? 'manual',
      patch.startedAt ?? null,
      patch.expiresAt ?? null,
      patch.notes ?? null,
      now,
    )
    .run()
}

export interface AdminUserListItem {
  id: string
  email: string
  display_name: string | null
  created_at: string
  data_version: number
  data_updated_at: string | null
  tier: string | null
  status: string | null
  expires_at: string | null
}

export async function listUsers(
  db: D1Database,
  query: string,
  limit: number,
  offset: number,
): Promise<AdminUserListItem[]> {
  const like = `%${query.toLowerCase()}%`
  const res = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.created_at, u.data_version, u.data_updated_at,
              s.tier, s.status, s.expires_at
       FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.email LIKE ?
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(like, limit, offset)
    .all<AdminUserListItem>()
  return res.results ?? []
}

export async function countUsers(db: D1Database, query: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM users WHERE email LIKE ?')
    .bind(`%${query.toLowerCase()}%`)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function adminStats(
  db: D1Database,
): Promise<{ users: number; pro: number; activeSubs: number }> {
  const users = await db.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
  const pro = await db
    .prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE tier = 'pro' AND status = 'active'")
    .first<{ n: number }>()
  const active = await db
    .prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE status = 'active'")
    .first<{ n: number }>()
  return { users: users?.n ?? 0, pro: pro?.n ?? 0, activeSubs: active?.n ?? 0 }
}

export async function deleteUserCascade(db: D1Database, userId: string): Promise<void> {
  // Explicit cascade (SQLite FK enforcement isn't guaranteed on).
  await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId).run()
  await db.prepare('DELETE FROM email_tokens WHERE user_id = ?').bind(userId).run()
  await db.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(userId).run()
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
}

// ---- Email tokens (verification / password reset / email change) ----

export type EmailTokenPurpose = 'verify_email' | 'reset_password' | 'change_email'

export interface EmailTokenRow {
  id: string
  user_id: string
  token_hash: string
  purpose: string
  new_email: string | null
  expires_at: string
  consumed_at: string | null
  created_at: string
}

export async function createEmailToken(
  db: D1Database,
  row: {
    id: string
    userId: string
    tokenHash: string
    purpose: EmailTokenPurpose
    newEmail?: string | null
    expiresAt: string
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO email_tokens (id, user_id, token_hash, purpose, new_email, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.userId,
      row.tokenHash,
      row.purpose,
      row.newEmail ?? null,
      row.expiresAt,
      new Date().toISOString(),
    )
    .run()
}

export async function getEmailTokenByHash(
  db: D1Database,
  tokenHash: string,
): Promise<EmailTokenRow | null> {
  return db
    .prepare('SELECT * FROM email_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first<EmailTokenRow>()
}

export async function consumeEmailToken(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE email_tokens SET consumed_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), id)
    .run()
}

/**
 * True if a live (unconsumed, unexpired) token of this purpose was created for
 * the user within `withinMs`. Used to throttle verification/reset emails.
 */
export async function hasRecentEmailToken(
  db: D1Database,
  userId: string,
  purpose: EmailTokenPurpose,
  withinMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - withinMs).toISOString()
  const row = await db
    .prepare(
      `SELECT 1 AS n FROM email_tokens
       WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL AND created_at > ?
       LIMIT 1`,
    )
    .bind(userId, purpose, since)
    .first<{ n: number }>()
  return row != null
}

export async function setUserEmailVerified(db: D1Database, userId: string): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, userId)
    .run()
}

export async function updateUserPassword(
  db: D1Database,
  userId: string,
  passwordHash: string,
  passwordSalt: string,
): Promise<void> {
  await db
    .prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, passwordSalt, new Date().toISOString(), userId)
    .run()
}

export async function updateUserEmail(
  db: D1Database,
  userId: string,
  email: string,
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE users SET email = ?, email_verified_at = ?, updated_at = ? WHERE id = ?')
    .bind(email.toLowerCase(), now, now, userId)
    .run()
}

/** Revoke every live refresh token for a user (e.g. after a password reset). */
export async function revokeAllRefreshTokens(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .bind(new Date().toISOString(), userId)
    .run()
}

export async function createRefreshToken(
  db: D1Database,
  row: { id: string; userId: string; tokenHash: string; expiresAt: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(row.id, row.userId, row.tokenHash, row.expiresAt, new Date().toISOString())
    .run()
}

export async function getRefreshTokenByHash(
  db: D1Database,
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  return db
    .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first<RefreshTokenRow>()
}

export async function revokeRefreshToken(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), id)
    .run()
}
