// Bahon API — Cloudflare Worker (Hono router).
// Phase 14: AI agent (STT + Workers AI agent). Phase 15 adds auth / sync /
// admin routes and D1 + R2 bindings onto this same app.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { transcribe } from './transcribe'
import { chatTurn, type ChatMessage, type ToolResultInput } from './chat'
import type { ChatContext } from './systemPrompt'
import { authRoutes } from './auth/routes'
import { syncRoutes } from './sync/routes'
import { adminRoutes } from './admin/routes'
import { requireAuth } from './middleware/requireAuth'
import { requirePro } from './middleware/requirePro'

interface ChatRequestBody {
  messages?: ChatMessage[]
  context?: ChatContext
  toolResults?: ToolResultInput[]
}

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: [
      'https://bahon.jafran.online',
      'https://admin.bahon.jafran.online',
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

app.post('/api/transcribe', requireAuth, requirePro, async (c) => {
  const form = await c.req.formData()
  const audio = form.get('audio') as unknown as Blob | string | null
  const lang = String(form.get('lang') ?? 'en')
  if (!audio || typeof audio === 'string') {
    return c.json({ error: 'missing_audio' }, 400)
  }
  const transcript = await transcribe(await audio.arrayBuffer(), lang, c.env)
  return c.json({ transcript })
})

app.post('/api/chat', requireAuth, requirePro, async (c) => {
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
  const result = await chatTurn(body.messages, body.context, body.toolResults, c.env)
  return c.json(result)
})

app.onError((err, c) =>
  c.json({ error: 'server_error', message: err instanceof Error ? err.message : 'unknown' }, 500),
)

export default app
