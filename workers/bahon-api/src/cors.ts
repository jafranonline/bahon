// CORS handling for the Bahon API.
// Only the production app origin and the local dev server are allowed.

const ALLOWED_ORIGINS = new Set([
  'https://bahon.jafran.online',
  'http://localhost:4546',
])

/**
 * Returns CORS headers appropriate for the request's Origin.
 * Echoes the origin back only when it is in the allowlist.
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = ALLOWED_ORIGINS.has(origin)
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/** Handles an OPTIONS preflight request. */
export function handlePreflight(request: Request): Response {
  return new Response(null, { status: 200, headers: corsHeaders(request) })
}

/** Builds a JSON Response with CORS headers attached. */
export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  })
}
