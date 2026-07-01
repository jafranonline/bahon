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
