// Bahon API — Cloudflare Worker (Hono router).
// Phase 14: AI agent (STT + Workers AI agent). Phase 15 adds auth / sync /
// admin routes and D1 + R2 bindings onto this same app.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { transcribe } from './transcribe'
import { extractFromImage, type VisionHint } from './vision'
import { chatTurn, type ChatMessage, type ToolResultInput } from './chat'
import type { ChatContext } from './systemPrompt'
import { authRoutes } from './auth/routes'
import { syncRoutes } from './sync/routes'
import { adminRoutes } from './admin/routes'
import { requireAuth } from './middleware/requireAuth'
import { requirePro } from './middleware/requirePro'
import { requireCredits, type CreditVars } from './middleware/requireCredits'
import { debitCredits, getCreditState } from './credits'
import { getSubscription } from './db'
import { isProActive } from './subscription'

interface ChatRequestBody {
  messages?: ChatMessage[]
  context?: ChatContext
  toolResults?: ToolResultInput[]
}

// Hard server-side input limits. The prompt's scope fence handles content;
// these bound cost and abuse regardless of what the client sends: a modified
// client can't stuff megabytes of "history" or junk roles into the model.
const MAX_MESSAGES = 20
const MAX_MESSAGE_CHARS = 1500
const MAX_TOOL_RESULTS = 10
const MAX_TOOL_RESULT_CHARS = 4000
const MAX_CONTEXT_CHARS = 80

function sanitizeMessages(raw: ChatMessage[]): ChatMessage[] {
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== '',
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
}

function sanitizeToolResults(raw: ToolResultInput[] | undefined): ToolResultInput[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  return raw.slice(0, MAX_TOOL_RESULTS).map((t) => ({
    toolUseId: String(t?.toolUseId ?? '').slice(0, 64),
    content: String(t?.content ?? '').slice(0, MAX_TOOL_RESULT_CHARS),
  }))
}

/** Clamps every context field to a sane length/type so a tampered client
 * can't smuggle instructions or junk into the system prompt. */
function sanitizeContext(raw: ChatContext): ChatContext {
  const text = (v: unknown): string =>
    typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').slice(0, MAX_CONTEXT_CHARS) : ''
  const numeric = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0
  return {
    vehicleId: text(raw.vehicleId),
    vehicleName: text(raw.vehicleName),
    vehicleType: text(raw.vehicleType),
    fuelType: text(raw.fuelType),
    currentOdometer: numeric(raw.currentOdometer),
    fuelPrice: numeric(raw.fuelPrice),
    today: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.today))
      ? String(raw.today)
      : new Date().toISOString().slice(0, 10),
    language: text(raw.language),
    currency: text(raw.currency),
    distanceUnit: text(raw.distanceUnit),
    volumeUnit: text(raw.volumeUnit),
  }
}

const app = new Hono<{ Bindings: Env; Variables: CreditVars }>()

app.use(
  '*',
  cors({
    origin: [
      'https://bahon.jafran.online',
      'https://admin.bahon.jafran.online',
      'https://bahon-admin.pages.dev',
      'http://localhost:4546',
      'http://localhost:4547',
    ],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
)

app.get('/api/health', (c) => c.json({ ok: true }))

app.route('/api/auth', authRoutes)
app.route('/api/sync', syncRoutes)
app.route('/api/admin', adminRoutes)

// Remaining AI credits for the signed-in user (read-only; grants the free /
// daily window as a side effect so the client always sees a live balance).
app.get('/api/credits', requireAuth, async (c) => {
  const userId = c.get('userId')
  const sub = await getSubscription(c.env.DB, userId)
  const credits = await getCreditState(c.env.DB, c.env, userId, isProActive(sub))
  return c.json({ credits })
})

// Voice (live/hands-free mode) is Pro-only; text chat and vision stay open to
// every signed-in user, metered by credits.
app.post('/api/transcribe', requireAuth, requirePro, requireCredits, async (c) => {
  const form = await c.req.formData()
  const audio = form.get('audio') as unknown as Blob | string | null
  const lang = String(form.get('lang') ?? 'en')
  if (!audio || typeof audio === 'string') {
    return c.json({ error: 'missing_audio' }, 400)
  }
  const transcript = await transcribe(await audio.arrayBuffer(), lang, c.env)
  // Not debited here: the transcript is immediately resent as the next
  // /api/chat message, which already bills it as input characters. Charging
  // here too would make speaking a message cost ~2x what typing it costs.
  return c.json({ transcript, credits: c.get('credits') })
})

app.post('/api/vision', requireAuth, requireCredits, async (c) => {
  const form = await c.req.formData()
  const image = form.get('image') as unknown as Blob | string | null
  const hint = String(form.get('hint') ?? 'auto') as VisionHint
  if (!image || typeof image === 'string') {
    return c.json({ error: 'missing_image' }, 400)
  }
  const mime = (image as Blob).type || 'image/jpeg'
  const extract = await extractFromImage(await image.arrayBuffer(), mime, hint, c.env)
  // Image scans are metered by the extracted data's length.
  const balance = await debitCredits(c.env.DB, c.get('userId'), JSON.stringify(extract ?? '').length)
  return c.json({ extract, credits: { ...c.get('credits'), balance } })
})

app.post('/api/chat', requireAuth, requireCredits, async (c) => {
  let body: ChatRequestBody
  try {
    body = await c.req.json<ChatRequestBody>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: 'missing_messages' }, 400)
  }
  if (!body.context) {
    return c.json({ error: 'missing_context' }, 400)
  }
  const messages = sanitizeMessages(body.messages)
  if (messages.length === 0) {
    return c.json({ error: 'missing_messages' }, 400)
  }
  const result = await chatTurn(
    messages,
    sanitizeContext(body.context),
    sanitizeToolResults(body.toolResults),
    c.env,
  )
  // Chat is metered by new input + output characters: the user's latest
  // message (only on the first round — tool-result rounds resend history),
  // plus the reply and any tool-call payloads the model produced.
  const inputChars = body.toolResults
    ? 0
    : [...messages].reverse().find((m) => m.role === 'user')?.content.length ?? 0
  const outputChars =
    (result.reply?.length ?? 0) +
    (result.toolCalls ? JSON.stringify(result.toolCalls).length : 0)
  const balance = await debitCredits(c.env.DB, c.get('userId'), inputChars + outputChars)
  return c.json({ ...result, credits: { ...c.get('credits'), balance } })
})

app.onError((err, c) =>
  c.json({ error: 'server_error', message: err instanceof Error ? err.message : 'unknown' }, 500),
)

export default app
