// Claude Haiku conversation turn with tool calling.

import Anthropic from '@anthropic-ai/sdk'
import type { Env } from './index'
import { tools } from './tools'
import { buildSystemPrompt, type ChatContext } from './systemPrompt'

const MODEL = 'claude-haiku-4-5-20251001'

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

/**
 * Runs one agent turn. `messages` is the running conversation in Anthropic
 * format (the frontend owns history). When `toolResults` is provided, they are
 * appended as a trailing user turn carrying tool_result blocks — the matching
 * assistant tool_use turn must already be present in `messages`.
 */
export async function chatTurn(
  messages: Anthropic.MessageParam[],
  context: ChatContext,
  toolResults: ToolResultInput[] | undefined,
  env: Env,
): Promise<ChatResult> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  const finalMessages: Anthropic.MessageParam[] = [...messages]
  if (toolResults && toolResults.length > 0) {
    finalMessages.push({
      role: 'user',
      content: toolResults.map((tr) => ({
        type: 'tool_result' as const,
        tool_use_id: tr.toolUseId,
        content: tr.content,
      })),
    })
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(context),
    tools,
    messages: finalMessages,
  })

  const toolCalls: ToolCall[] = []
  let text = ''
  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: (block.input ?? {}) as Record<string, unknown>,
      })
    }
  }

  if (toolCalls.length > 0) {
    return text.trim() ? { toolCalls, reply: text.trim() } : { toolCalls }
  }
  return { reply: text.trim() }
}
