// Agent conversation turn with tool calling, via Cloudflare Workers AI.

import type { Env } from './types'
import { tools, type WorkerAITool } from './tools'
import { buildSystemPrompt, buildChatSystemPrompt, type ChatContext } from './systemPrompt'

// Llama 4 Scout: natively multimodal (vision) + function-calling, and a far
// better instruction-follower than the 3.1 70B it replaced (which mis-fired
// tools and needed heavy artifact scrubbing). One model now powers chat,
// tool-calling, and image extraction (see vision.ts).
export const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'

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

/** OpenAI-style tool wrapper expected by Llama 4 Scout on Workers AI. */
interface OpenAITool {
  type: 'function'
  function: WorkerAITool
}

// Shape of the Workers AI chat response when tools are provided.
// Workers AI tool-call shapes vary by model: the flat form ({ name, arguments })
// and the OpenAI form ({ id, type, function: { name, arguments } }). Llama 4
// Scout returns the latter. `arguments` may be an object or a JSON string.
type RawArgs = Record<string, unknown> | string | undefined
interface AIToolCall {
  name?: string
  arguments?: RawArgs
  function?: { name?: string; arguments?: RawArgs }
}

function toolName(tc: AIToolCall): string {
  return tc.function?.name ?? tc.name ?? ''
}

/** Normalizes a tool call's `arguments` (object or JSON string) to an object. */
function coerceArgs(args: RawArgs): Record<string, unknown> {
  if (!args) return {}
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return args
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
  model: string = MODEL,
): Promise<ChatResult> {
  const history = messages
    .filter((m) => m.content.trim() !== '')
    .map((m) => ({ role: m.role, content: m.content }))

  // The generated Workers AI tool type requires a `description` on every
  // property and does not model `enum`, so it rejects our richer schemas.
  // Call through a locally-typed reference to keep our authoring types clean.
  const run = env.AI.run.bind(env.AI) as (
    model: string,
    inputs: { messages: AIMessage[]; tools?: OpenAITool[] },
  ) => Promise<AIChatOutput>

  // Results turn: the frontend already executed the tool(s). Feed the results
  // back WITHOUT tools so the model must produce a text reply (a confirmation,
  // or an answer built from read-tool data) instead of re-calling the tool.
  // Only the exchange that triggered the tool matters for this reply, so send
  // just the tail from the last user turn — resending the full history here
  // roughly doubled the input tokens of every tool action for no benefit.
  if (toolResults && toolResults.length > 0) {
    const lastUserIdx = history.map((m) => m.role).lastIndexOf('user')
    const tail = lastUserIdx >= 0 ? history.slice(lastUserIdx) : history
    const resultsText = toolResults.map((t) => t.content).join('\n')
    const aiMessages: AIMessage[] = [
      { role: 'system', content: buildChatSystemPrompt(context) },
      ...tail,
      {
        role: 'user',
        content:
          `The requested action(s) finished with these results:\n${resultsText}\n\n` +
          'Reply to the user briefly in their language. Confirm ONLY what a ' +
          'result shows actually succeeded ("ok"); if a result is an error or ' +
          'a question, relay that instead of claiming success. Answer data ' +
          'questions using the results. Do not call any tools.',
      },
    ]
    const result = await run(model, { messages: aiMessages })
    return { reply: stripArtifacts(result.response ?? '') }
  }

  // First turn. Decide whether the message could plausibly need a tool. For
  // greetings, small talk and general questions we skip the tool schema
  // entirely: a smaller prompt (fewer tokens), a faster reply, and no risk of
  // a spurious tool call. The gate is intentionally broad — over-offering only
  // costs tokens, but wrongly withholding would drop a real action.
  const lastUserText =
    [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  // Match ASCII AND Bengali (০-৯) digits, so "৩০০ টাকার তেল" is seen as actionable.
  const hasDigit = /[\d০-৯]/.test(lastUserText)
  const actionable =
    hasDigit ||
    ACTION_KW.test(lastUserText) ||
    SETTINGS_KW.test(lastUserText) ||
    NAV_KW.test(lastUserText) ||
    READ_KW.test(lastUserText)

  if (!actionable) {
    const chat = await run(model, {
      messages: [
        { role: 'system', content: buildChatSystemPrompt(context) },
        ...history,
      ],
    })
    return { reply: stripArtifacts(chat.response ?? '') }
  }

  // Send only the tool schemas the message's intent can actually use. The
  // post-filters below already discard update_settings / navigate_to / read
  // calls whose keywords didn't match, so omitting those schemas up front is
  // behavior-preserving — it just stops paying their tokens on every turn.
  // Llama 4 Scout expects OpenAI-style definitions ({ type, function }).
  const SOFT_TOOLS: Record<string, RegExp> = {
    update_settings: SETTINGS_KW,
    navigate_to: NAV_KW,
    get_stats_summary: READ_KW,
    list_recent_logs: READ_KW,
    compare_periods: READ_KW,
    get_vehicle_overview: READ_KW,
  }
  const wantsWrite = hasDigit || ACTION_KW.test(lastUserText)
  const openaiTools: OpenAITool[] = tools
    .filter((t) => {
      const kw = SOFT_TOOLS[t.name]
      return kw ? kw.test(lastUserText) : wantsWrite
    })
    .map((t) => ({ type: 'function', function: t }))

  const aiMessages: AIMessage[] = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history,
  ]
  const result = await run(model, { messages: aiMessages, tools: openaiTools })

  let toolCalls: ToolCall[] = (result.tool_calls ?? [])
    .map((tc, i) => {
      const name = toolName(tc)
      const rawArgs = tc.function?.arguments ?? tc.arguments
      return {
        id: `call_${i}`,
        name,
        input: normalizeArgs(name, coerceArgs(rawArgs), context, lastUserText),
      }
    })
    // Drop any call we couldn't resolve a name for (malformed model output).
    .filter((tc) => tc.name !== '')

  // The model sometimes emits the same call several times in one response
  // (observed: 3x add_reminder for one request). Executing every copy writes
  // duplicate records, so collapse exact repeats — and for reminders, repeats
  // of the same title regardless of the other fields.
  const seen = new Set<string>()
  toolCalls = toolCalls.filter((c) => {
    const key =
      c.name === 'add_reminder'
        ? `add_reminder:${String((c.input as { title?: unknown }).title ?? '')}`
        : `${c.name}:${JSON.stringify(c.input)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Guard against hallucinated logs: a fuel/service/expense entry with no
  // numbers in the user's message means the model invented the amounts. Drop
  // those so the frontend asks the user for details instead of saving garbage.
  if (!hasDigit) {
    toolCalls = toolCalls.filter(
      (c) => !['add_fuel_log', 'add_service_log', 'add_expense'].includes(c.name),
    )
  }

  // Tool-calling models over-eagerly fire "soft" tools on greetings/questions
  // (e.g. "how are you" → update_settings). Only keep those when the message
  // actually expresses that intent; otherwise fall through to a chat reply.
  const READ_TOOLS = ['list_recent_logs', 'get_stats_summary', 'compare_periods', 'get_vehicle_overview']
  toolCalls = toolCalls.filter((c) => {
    if (c.name === 'update_settings') return SETTINGS_KW.test(lastUserText)
    if (c.name === 'navigate_to') return NAV_KW.test(lastUserText)
    if (READ_TOOLS.includes(c.name)) return READ_KW.test(lastUserText)
    return true
  })

  const text = (result.response ?? '').trim()

  if (toolCalls.length > 0) {
    return text ? { toolCalls, reply: text } : { toolCalls }
  }

  // No tool call. Drop raw function-calling artifacts. If that leaves nothing,
  // the model was confused by the tools for a plain chat question — retry once
  // WITHOUT tools so it actually answers instead of returning empty.
  let reply = ARTIFACT_RE.test(text) ? '' : text
  if (!reply) {
    const chat = await run(model, {
      messages: [{ role: 'system', content: buildChatSystemPrompt(context) }, ...history],
    })
    reply = stripArtifacts(chat.response ?? '')
  }
  return { reply }
}

/** Removes function-calling artifacts and any stray non-Latin/Bengali scripts
 * (the fp8 model occasionally emitted CJK). */
function stripArtifacts(text: string): string {
  const t = text.trim()
  if (ARTIFACT_RE.test(t)) return ''
  // Drop CJK / other unexpected scripts token-by-token, keep Latin + Bengali.
  return t.replace(/[　-鿿가-힯ऀ-ॿ]/g, '').replace(/\s{2,}/g, ' ').trim()
}

const ARTIFACT_RE =
  /your (request|function call)[^.]*(incomplete|not sufficient)|provide more details|specify the task you need|no function/i

// Intent keywords (English + Banglish + Bangla) that justify a "soft" tool call.
const SETTINGS_KW = /\b(setting|settings|theme|dark|light|mode|language|bangla|bengali|english|currency|unit|units|km|mile|litre|gallon)\b|সেটিং|ভাষা|থিম|ডার্ক|লাইট|মুদ্রা|একক/i
const NAV_KW = /\b(go|goto|open|take me|navigate|jao|jabo|kholo|khulo|niye|screen|page|tab|dashboard)\b|যাও|খোল|খুলো|পেজ|স্ক্রিন/i
const READ_KW = /\b(show|list|recent|latest|last|history|how much|how many|total|spend|spent|summary|stat|stats|compare|comparison|average|avg|mileage|efficiency|per km|per litre|breakdown|overview|koto|ktoto|dekha|dekhao|khoroch|kharoch|hisab|tulona|gore)\b|দেখা|দেখাও|কত|তালিকা|খরচ|হিসাব|সারাংশ|তুলনা|গড়|মাইলেজ/i

// Action verbs (English + Banglish + Bangla) signalling the user wants to log,
// save, set a reminder, delete, or change something — i.e. a tool might be
// needed. Kept deliberately broad so real actions are never gated out (the
// destructive verbs still pass through the frontend confirmation gate).
const ACTION_KW =
  /\b(add|log|save|record|note|put|remind|reminder|set|change|update|fill|filled|refuel|fuel|petrol|octane|diesel|gas|bought|buy|spent|spend|paid|pay|service|serviced|delete|remove|erase|clear|wipe|reset|kinlam|kinechi|dilam|jog|mone|muche|muchhe|bhorlam|bhorechi|tel)\b|যোগ|মনে|পরিবর্তন|কিনেছি|কিনলাম|দিলাম|সার্ভিস|রিমাইন্ডার|মুছে|ডিলিট|বাদ|তেল|ভরেছি|ভরলাম|ভরো|পেট্রোল|অকটেন|ডিজেল|গ্যাস|খরচ/i

const NULLISH = new Set(['null', 'undefined', '', 'none', 'n/a', 'nil', 'na'])
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
