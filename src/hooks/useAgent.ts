import { useCallback, useRef, useState } from 'react'
import { API_BASE_URL } from '@utils/constants'

export interface AgentContext {
  vehicleId: string
  vehicleName: string
  vehicleType: string
  fuelType: string
  currentOdometer: number
  today: string
  language: string
  currency: string
  distanceUnit: string
  volumeUnit: string
}

export interface AgentToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export type AgentStatus =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'error'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'tool_status'
  content: string
  ts: number
}

interface ChatResponse {
  reply?: string
  toolCalls?: AgentToolCall[]
  error?: string
}

interface UseAgentOptions {
  context: AgentContext | null
  onToolCall: (call: AgentToolCall) => Promise<unknown>
}

const MAX_ROUNDS = 5

/** Maps a tool name to a status token used for the i18n label, or null when
 * the tool should not surface a status line (read-only tools). */
function statusToken(name: string): 'saved' | 'updated' | 'navigating' | null {
  if (name === 'navigate_to') return 'navigating'
  if (name.startsWith('update_')) return 'updated'
  if (name.startsWith('add_')) return 'saved'
  return null
}

function newMessage(
  role: AgentMessage['role'],
  content: string,
): AgentMessage {
  return { id: crypto.randomUUID(), role, content, ts: Date.now() }
}

function stringifyResult(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result)
  } catch {
    return 'ok'
  }
}

export function useAgent({ context, onToolCall }: UseAgentOptions) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Chat history sent to the API (user/assistant text only, no status lines).
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  const fail = useCallback((messageKey: string) => {
    setStatus('error')
    setMessages((prev) => [...prev, newMessage('assistant', messageKey)])
  }, [])

  const postChat = useCallback(
    async (
      toolResults?: { toolUseId: string; content: string }[],
    ): Promise<ChatResponse> => {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiHistoryRef.current,
          context,
          toolResults,
        }),
      })
      if (!res.ok) throw new Error(`chat_${res.status}`)
      return (await res.json()) as ChatResponse
    },
    [context],
  )

  const runAgentLoop = useCallback(async () => {
    setStatus('thinking')
    try {
      let toolResults: { toolUseId: string; content: string }[] | undefined
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await postChat(toolResults)

        if (res.toolCalls && res.toolCalls.length > 0) {
          const results: { toolUseId: string; content: string }[] = []
          for (const call of res.toolCalls) {
            const token = statusToken(call.name)
            if (token) {
              setMessages((prev) => [...prev, newMessage('tool_status', token)])
            }
            const result = await onToolCall(call)
            results.push({ toolUseId: call.id, content: stringifyResult(result) })
          }
          toolResults = results
          continue
        }

        const reply = (res.reply ?? '').trim()
        if (reply) {
          apiHistoryRef.current.push({ role: 'assistant', content: reply })
          setMessages((prev) => [...prev, newMessage('assistant', reply)])
        } else {
          // Model produced no usable reply (misfire / filtered artifact).
          setMessages((prev) => [...prev, newMessage('assistant', 'agent.no_understand')])
        }
        setStatus('idle')
        return
      }
      // Ran out of rounds without a final reply.
      setMessages((prev) => [...prev, newMessage('assistant', 'agent.no_understand')])
      setStatus('idle')
    } catch {
      fail('agent.error_generic')
    }
  }, [postChat, onToolCall, fail])

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !context) return
      if (!navigator.onLine) {
        setMessages((prev) => [
          ...prev,
          newMessage('user', trimmed),
          newMessage('assistant', 'agent.error_offline'),
        ])
        setStatus('error')
        return
      }
      apiHistoryRef.current.push({ role: 'user', content: trimmed })
      setMessages((prev) => [...prev, newMessage('user', trimmed)])
      void runAgentLoop()
    },
    [context, runAgentLoop],
  )

  const startVoice = useCallback(async () => {
    if (!context) return
    if (!navigator.onLine) {
      fail('agent.error_offline')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setStatus('transcribing')
        try {
          const form = new FormData()
          form.append('audio', blob, 'voice.webm')
          form.append('lang', context.language)
          const res = await fetch(`${API_BASE_URL}/api/transcribe`, {
            method: 'POST',
            body: form,
          })
          if (!res.ok) throw new Error(`transcribe_${res.status}`)
          const { transcript } = (await res.json()) as { transcript?: string }
          if (transcript && transcript.trim()) sendText(transcript.trim())
          else setStatus('idle')
        } catch {
          fail('agent.error_generic')
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setStatus('listening')
    } catch {
      fail('agent.error_no_mic')
    }
  }, [context, fail, sendText])

  const stopVoice = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    mediaRecorderRef.current = null
  }, [])

  const reset = useCallback(() => {
    stopVoice()
    apiHistoryRef.current = []
    setMessages([])
    setStatus('idle')
  }, [stopVoice])

  return { messages, status, sendText, startVoice, stopVoice, reset }
}
