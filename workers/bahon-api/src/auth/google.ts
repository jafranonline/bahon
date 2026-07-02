// Google Sign-In: verify a Google ID token (JWT) against Google's JWKS.

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

export interface GoogleIdentity {
  sub: string
  email: string
  emailVerified: boolean
  name: string | null
}

interface GoogleJwk {
  kid: string
  kty: string
  n: string
  e: string
  alg: string
}

interface IdTokenPayload {
  iss?: string
  aud?: string
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  exp?: number
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function decodeJson<T>(b64url: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(b64url))) as T
}

/**
 * Verifies signature, issuer, audience, and expiry of a Google ID token.
 * Returns the identity on success, or null on any failure.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<GoogleIdentity | null> {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const header = decodeJson<{ kid?: string; alg?: string }>(parts[0])
    if (header.alg !== 'RS256' || !header.kid) return null

    // Google's JWKS responses carry long cache lifetimes; the Workers fetch
    // cache honours them, so this is cheap on the hot path.
    const jwksRes = await fetch(GOOGLE_JWKS_URL, { cf: { cacheEverything: true } })
    if (!jwksRes.ok) return null
    const { keys } = (await jwksRes.json()) as { keys: GoogleJwk[] }
    const jwk = keys.find((k) => k.kid === header.kid)
    if (!jwk) return null

    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256' },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )
    if (!valid) return null

    const payload = decodeJson<IdTokenPayload>(parts[1])
    if (!payload.iss || !GOOGLE_ISSUERS.includes(payload.iss)) return null
    if (payload.aud !== clientId) return null
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null
    if (!payload.sub || !payload.email) return null

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
    }
  } catch {
    return null
  }
}
