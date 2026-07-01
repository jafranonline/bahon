// Agent conversation turn with tool calling, via Cloudflare Workers AI.

import type { Env } from './index'
import { tools, type WorkerAITool } from './tools'
import { buildSystemPrompt, type ChatContext } from './systemPrompt'

// Strongest Workers AI model with function-calling + decent multilingual.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
}

export interface ToolResultInput {
  toolUseId: string
  content: string
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ChatResult {
  reply?: string
  toolCalls?: ToolCall[]
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

// Shape of the Workers AI chat response when tools are provided.
interface AIToolCall {
  name: string
  arguments?: Record<string, unknown>
}
interface AIChatOutput {
  response?: string
  tool_calls?: AIToolCall[]
}

/**
 * Runs one agent turn against Workers AI. `messages` is the running
 * conversation (the frontend owns history). When `toolResults` is provided,
 * each is appended as a tool-role message carrying the execution result.
 */
export async function chatTurn(
  messages: ChatMessage[],
  context: ChatContext,
  toolResults: ToolResultInput[] | undefined,
  env: Env,
): Promise<ChatResult> {
  const history = messages
    .filter((m) => m.content.trim() !== '')
    .map((m) => ({ role: m.role, content: m.content }))

  // The generated Workers AI tool type requires a `description` on every
  // property and does not model `enum`, so it rejects our richer schemas.
  // Call through a locally-typed reference to keep our authoring types clean.
  const run = env.AI.run.bind(env.AI) as (
    model: string,
    inputs: { messages: AIMessage[]; tools?: WorkerAITool[] },
  ) => Promise<AIChatOutput>

  // Results turn: the frontend already executed the tool(s). Feed the results
  // back WITHOUT tools so the model must produce a text reply (a confirmation,
  // or an answer built from read-tool data) instead of re-calling the tool.
  if (toolResults && toolResults.length > 0) {
    const resultsText = toolResults.map((t) => t.content).join('\n')
    const aiMessages: AIMessage[] = [
      { role: 'system', content: buildSystemPrompt(context) },
      ...history,
      {
        role: 'user',
        content:
          `The requested action(s) were completed with these results:\n${resultsText}\n\n` +
          'Reply to the user briefly in their language — confirm what was done, ' +
          'or answer their question using this data. Do not call any tools.',
      },
    ]
    const result = await run(MODEL, { messages: aiMessages })
    return { reply: (result.response ?? '').trim() }
  }

  // First turn: offer the tools and let the model decide.
  const aiMessages: AIMessage[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history,
  ]
  const result = await run(MODEL, { messages: aiMessages, tools })

  const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  let toolCalls: ToolCall[] = (result.tool_calls ?? []).map((tc, i) => ({
    id: `call_${i}`,
    name: tc.name,
    input: normalizeArgs(tc.name, tc.arguments ?? {}, context, lastUserText),
  }))

  // Guard against hallucinated logs: a fuel/service/expense entry with no
  // numbers in the user's message means the model invented the amounts. Drop
  // those so the frontend asks the user for details instead of saving garbage.
  const hasDigit = /\d/.test(lastUserText)
  if (!hasDigit) {
    toolCalls = toolCalls.filter(
      (c) => !['add_fuel_log', 'add_service_log', 'add_expense'].includes(c.name),
    )
  }

  const text = (result.response ?? '').trim()

  if (toolCalls.length > 0) {
    return text ? { toolCalls, reply: text } : { toolCalls }
  }
  // Drop raw function-calling failure artifacts Llama sometimes emits as text;
  // the frontend shows a localized "didn't understand" message when reply is empty.
  return { reply: ARTIFACT_RE.test(text) ? '' : text }
}

const ARTIFACT_RE =
  /your (request|function call)[^.]*(incomplete|not sufficient)|provide more details|specify the task you need|no function/i

const NULLISH = new Set(['null', 'undefined', '', 'none', 'n/a'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Signals (English + Banglish + Bangla) that the user actually referred to a
// date. If none are present we ignore any date the model invented and use today.
const DATE_SIGNAL_RE =
  /\b(today|tomorrow|yesterday|aj|ajke|kal|kalke|gotokal|gotkal|porshu|poroshu|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}|\d{1,2}[/-]\d{1,2})\b|[০-৯]|আজ|কাল|গতকাল|পরশু/i

/**
 * Cleans up a model's tool arguments against the tool's own schema:
 * coerces numeric fields from strings, drops null-ish values, forces the
 * vehicleId from context, and defaults date fields to today. This absorbs the
 * common quirks of Workers AI function-calling (stringified numbers, literal
 * "today"/"null", hallucinated ids) so the frontend receives clean data.
 */
function normalizeArgs(
  name: string,
  raw: Record<string, unknown>,
  ctx: ChatContext,
  userText: string,
): Record<string, unknown> {
  const schema = tools.find((t) => t.name === name)
  const out: Record<string, unknown> = { ...raw }
  if (!schema) return out

  const props = schema.parameters.properties

  for (const key of Object.keys(out)) {
    const value = out[key]
    if (
      value === null ||
      (typeof value === 'string' && NULLISH.has(value.trim().toLowerCase()))
    ) {
      delete out[key]
      continue
    }
    const prop = props[key] as { type?: string } | undefined
    if (prop?.type === 'number' && typeof value === 'string') {
      const n = Number(value.replace(/[^0-9.-]/g, ''))
      if (Number.isFinite(n)) out[key] = n
      else delete out[key]
    }
  }

  // Force the real active vehicle id whenever the tool takes one.
  if ('vehicleId' in props) out.vehicleId = ctx.vehicleId

  // Recover the fuel station / shop name from "<place> theke" or "from <place>"
  // when the model omitted it or filled a placeholder ("Default Station" etc.).
  const placeField =
    name === 'add_fuel_log' ? 'stationName'
    : name === 'add_service_log' ? 'shopName'
    : undefined
  if (placeField) {
    const cur = out[placeField]
    const isPlaceholder =
      typeof cur !== 'string' || /default|unknown|no ?name|not ?provided/i.test(cur)
    if (isPlaceholder) {
      const place = extractPlace(userText)
      if (place) out[placeField] = place
      else delete out[placeField]
    }
  }

  // Default/repair date fields. Only trust a model date when the user actually
  // referenced a date; otherwise (and for malformed dates) use today.
  if ('date' in props) {
    const d = out.date
    const wellFormed = typeof d === 'string' && DATE_RE.test(d)
    out.date = wellFormed && DATE_SIGNAL_RE.test(userText) ? d : ctx.today
  }

  return out
}

/**
 * Extracts a place name from common "bought from <place>" phrasings:
 * "Rajshahi theke ..." (Banglish for "from Rajshahi") or "from Rajshahi".
 */
function extractPlace(text: string): string | undefined {
  const theke = text.match(/([A-Za-z][A-Za-z-]*|[ঀ-৿]+)\s+theke\b/i)
  if (theke) return titleCase(theke[1])
  const from = text.match(/\bfrom\s+([A-Za-z][A-Za-z-]*|[ঀ-৿]+)/i)
  if (from) return titleCase(from[1])
  return undefined
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
