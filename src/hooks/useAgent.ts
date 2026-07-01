import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@api/client'
import { createVAD, type VADHandle } from '@utils/vad'

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
  | 'live_listening'
  | 'live_capturing'
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
/** Auto-exit live mode after this much silence, to protect battery + privacy. */
const LIVE_IDLE_MS = 45_000
/** Discard captured clips smaller than this (noise/taps) without transcribing. */
const MIN_CLIP_BYTES = 1200

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

/** Short haptic pulse (no-op where unsupported) — a "your turn" cue for
 * hands-free live mode when the user isn't looking at the screen. */
function haptic(ms: number): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
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
  const [liveMode, setLiveMode] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Chat history sent to the API (user/assistant text only, no status lines).
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  // Live (hands-free) mode: a persistent mic stream + VAD drive an auto-turn loop.
  const liveModeRef = useRef(false)
  const liveStreamRef = useRef<MediaStream | null>(null)
  const vadRef = useRef<VADHandle | null>(null)
  const liveRecorderRef = useRef<MediaRecorder | null>(null)
  const liveChunksRef = useRef<Blob[]>([])
  const liveClipOkRef = useRef(false)
  const idleTimerRef = useRef<number | null>(null)
  // Latest handleUtterance, called from per-utterance MediaRecorder.onstop.
  const handleUtteranceRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const fail = useCallback((messageKey: string) => {
    setStatus('error')
    setMessages((prev) => [...prev, newMessage('assistant', messageKey)])
  }, [])

  const postChat = useCallback(
    async (
      toolResults?: { toolUseId: string; content: string }[],
    ): Promise<ChatResponse> => {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiHistoryRef.current,
          context,
          toolResults,
        }),
      })
      if (res.status === 403) throw new Error('pro_required')
      if (res.status === 401) throw new Error('login_required')
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
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'pro_required') fail('agent.pro_required')
      else if (code === 'login_required') fail('agent.login_required')
      else fail('agent.error_generic')
    }
  }, [postChat, onToolCall, fail])

  const sendText = useCallback(
    (text: string): Promise<void> => {
      const trimmed = text.trim()
      if (!trimmed || !context) return Promise.resolve()
      if (!navigator.onLine) {
        setMessages((prev) => [
          ...prev,
          newMessage('user', trimmed),
          newMessage('assistant', 'agent.error_offline'),
        ])
        setStatus('error')
        return Promise.resolve()
      }
      apiHistoryRef.current.push({ role: 'user', content: trimmed })
      setMessages((prev) => [...prev, newMessage('user', trimmed)])
      return runAgentLoop()
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
          const res = await apiFetch('/api/transcribe', { method: 'POST', body: form })
          if (res.status === 403) return fail('agent.pro_required')
          if (res.status === 401) return fail('agent.login_required')
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

  // Keep the latest context reachable from long-lived live-mode callbacks.
  const contextRef = useRef(context)
  contextRef.current = context

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current != null) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const stopLive = useCallback(() => {
    liveModeRef.current = false
    setLiveMode(false)
    clearIdleTimer()
    vadRef.current?.stop()
    vadRef.current = null
    const rec = liveRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      try { rec.stop() } catch { /* already stopped */ }
    }
    liveRecorderRef.current = null
    liveStreamRef.current?.getTracks().forEach((track) => track.stop())
    liveStreamRef.current = null
    setStatus((s) => (s === 'thinking' || s === 'transcribing' ? s : 'idle'))
  }, [clearIdleTimer])

  const armIdleTimer = useCallback(() => {
    clearIdleTimer()
    idleTimerRef.current = window.setTimeout(() => {
      if (!liveModeRef.current) return
      stopLive()
      setMessages((prev) => [...prev, newMessage('assistant', 'agent.live_timeout')])
    }, LIVE_IDLE_MS)
  }, [clearIdleTimer, stopLive])

  const resumeListening = useCallback(() => {
    if (!liveModeRef.current) return
    setStatus('live_listening')
    vadRef.current?.resume()
    armIdleTimer()
    haptic(25) // "your turn" cue after the agent's reply
  }, [armIdleTimer])

  // Transcribe one captured utterance, run the agent, then resume listening.
  const handleUtterance = useCallback(async () => {
    const context = contextRef.current
    if (!liveModeRef.current || !context) return
    const blob = new Blob(liveChunksRef.current, { type: 'audio/webm' })
    liveChunksRef.current = []
    if (!liveClipOkRef.current || blob.size < MIN_CLIP_BYTES) {
      resumeListening() // blip / noise — skip the API round-trip
      return
    }
    setStatus('transcribing')
    try {
      const form = new FormData()
      form.append('audio', blob, 'voice.webm')
      form.append('lang', context.language)
      const res = await apiFetch('/api/transcribe', { method: 'POST', body: form })
      if (res.status === 403) { fail('agent.pro_required'); stopLive(); return }
      if (res.status === 401) { fail('agent.login_required'); stopLive(); return }
      if (!res.ok) throw new Error(`transcribe_${res.status}`)
      const { transcript } = (await res.json()) as { transcript?: string }
      if (transcript && transcript.trim()) await sendText(transcript.trim())
      resumeListening()
    } catch {
      fail('agent.error_generic')
      stopLive()
    }
  }, [fail, sendText, resumeListening, stopLive])
  handleUtteranceRef.current = handleUtterance

  const startLive = useCallback(async () => {
    const context = contextRef.current
    if (!context || liveModeRef.current) return
    if (!navigator.onLine) { fail('agent.error_offline'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      liveStreamRef.current = stream
      liveModeRef.current = true
      setLiveMode(true)
      setStatus('live_listening')
      armIdleTimer()
      haptic(25) // confirm live mode is armed and listening
      vadRef.current = createVAD(stream, {
        onSpeechStart: () => {
          if (!liveModeRef.current) return
          clearIdleTimer()
          liveChunksRef.current = []
          const rec = new MediaRecorder(stream)
          rec.ondataavailable = (e) => { if (e.data.size > 0) liveChunksRef.current.push(e.data) }
          rec.onstop = () => { void handleUtteranceRef.current() }
          liveRecorderRef.current = rec
          rec.start()
          setStatus('live_capturing')
        },
        onSpeechEnd: (longEnough) => {
          if (!liveModeRef.current) return
          const rec = liveRecorderRef.current
          if (!rec || rec.state === 'inactive') return
          liveClipOkRef.current = longEnough
          vadRef.current?.pause() // half-duplex: stop listening while processing
          rec.stop()
        },
      })
    } catch {
      liveModeRef.current = false
      setLiveMode(false)
      fail('agent.error_no_mic')
    }
  }, [fail, armIdleTimer, clearIdleTimer])

  const reset = useCallback(() => {
    stopVoice()
    stopLive()
    apiHistoryRef.current = []
    setMessages([])
    setStatus('idle')
  }, [stopVoice, stopLive])

  // Safety net: never leave the mic/audio graph running past unmount.
  useEffect(() => {
    return () => {
      liveModeRef.current = false
      vadRef.current?.stop()
      const rec = liveRecorderRef.current
      if (rec && rec.state !== 'inactive') {
        try { rec.stop() } catch { /* already stopped */ }
      }
      liveStreamRef.current?.getTracks().forEach((track) => track.stop())
      if (idleTimerRef.current != null) clearTimeout(idleTimerRef.current)
    }
  }, [])

  return { messages, status, liveMode, sendText, startVoice, stopVoice, startLive, stopLive, reset }
}
