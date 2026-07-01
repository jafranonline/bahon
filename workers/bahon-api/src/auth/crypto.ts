// Password hashing (PBKDF2) and hashing helpers via WebCrypto — no external deps.

// Cloudflare Workers' WebCrypto caps PBKDF2 at 100k iterations (higher values
// throw at runtime), so we use the maximum allowed.
const PBKDF2_ITERATIONS = 100_000

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** Constant-time comparison of two hex strings. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

async function derive(password: string, saltBytes: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

/** Hashes a password with a fresh random salt. Returns hex hash + hex salt. */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, saltBytes)
  return { hash, salt: bytesToHex(saltBytes) }
}

/** Verifies a password against a stored hex hash + hex salt (constant-time). */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const candidate = await derive(password, hexToBytes(salt))
  return timingSafeEqual(candidate, hash)
}

/** SHA-256 of a string, hex-encoded. Used to store refresh tokens hashed. */
export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return bytesToHex(new Uint8Array(digest))
}

/** Cryptographically-random opaque token (hex), for refresh tokens. */
export function randomToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}
