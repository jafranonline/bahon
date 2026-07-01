// Bahon API — Cloudflare Worker.
// Phase 14: AI agent backend (STT + Claude Haiku proxy).
// Phase 15 (TASK-059+) will refactor this hand-rolled router onto Hono and add
// auth / sync / admin routes plus D1 + R2 bindings.

import type Anthropic from '@anthropic-ai/sdk'
import { handlePreflight, jsonResponse } from './cors'
import { transcribe } from './transcribe'
import { chatTurn, type ToolResultInput } from './chat'
import type { ChatContext } from './systemPrompt'

export interface Env {
  AI: Ai
  ANTHROPIC_API_KEY: string
}

interface ChatRequestBody {
  messages?: Anthropic.MessageParam[]
  context?: ChatContext
  toolResults?: ToolResultInput[]
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return handlePreflight(request)

    const url = new URL(request.url)

    try {
      if (url.pathname === '/api/transcribe' && request.method === 'POST') {
        return await handleTranscribe(request, env)
      }
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return await handleChat(request, env)
      }
      return jsonResponse(request, { error: 'not_found' }, 404)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error'
      return jsonResponse(request, { error: 'server_error', message }, 500)
    }
  },
} satisfies ExportedHandler<Env>

async function handleTranscribe(request: Request, env: Env): Promise<Response> {
  const form = await request.formData()
  // Workers types `FormData.get` as `string | null`, but file uploads return a
  // Blob/File at runtime — cast, then guard on the string case.
  const audio = form.get('audio') as unknown as Blob | string | null
  const lang = String(form.get('lang') ?? 'en')

  if (!audio || typeof audio === 'string') {
    return jsonResponse(request, { error: 'missing_audio' }, 400)
  }

  const transcript = await transcribe(await audio.arrayBuffer(), lang, env)
  return jsonResponse(request, { transcript })
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  // Validate the request body first (400s) before checking server config (500).
  let body: ChatRequestBody
  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return jsonResponse(request, { error: 'invalid_json' }, 400)
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonResponse(request, { error: 'missing_messages' }, 400)
  }
  if (!body.context) {
    return jsonResponse(request, { error: 'missing_context' }, 400)
  }

  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      request,
      { error: 'server_error', message: 'ANTHROPIC_API_KEY is not configured' },
      500,
    )
  }

  const result = await chatTurn(body.messages, body.context, body.toolResults, env)
  return jsonResponse(request, result)
}
