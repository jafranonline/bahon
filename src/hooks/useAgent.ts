import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@api/client'
import { createVAD, type VADHandle } from '@utils/vad'
import { useAuthStore } from '@store/authStore'

export interface AgentContext {
  vehicleId: string
  vehicleName: string
  vehicleType: string
  fuelType: string
  currentOdometer: number
  /** Saved price per litre for this vehicle's fuel type (0 if unset). Lets the
   * agent turn a bare taka total into litres. */
  fuelPrice: number
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
  | 'scanning'
  | 'error'

/** A field parsed from an image, shown as a line in the review card. */
export interface ConfirmField {
  labelKey: string
  value: string
}

/** A pending action awaiting the user's Confirm/Cancel — used for destructive
 * tools (delete/clear) and for image-extracted entries before they are saved. */
export interface PendingConfirm {
  kind: 'destructive' | 'extract'
  /** Tool call to run when the user confirms. */
  call: AgentToolCall
  /** i18n key for the card's headline (e.g. agent.confirm_delete_vehicle). */
  titleKey: string
  /** Extracted fields to preview (extract kind only). */
  fields?: ConfirmField[]
  /** Set once acted on, so the buttons disable and read-only. */
  done?: 'confirmed' | 'cancelled'
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'tool_status' | 'confirm'
  content: string
  ts: number
  /** Data URL of an image the user attached (user rows only). */
  image?: string
  /** Present on `confirm` rows. */
  confirm?: PendingConfirm
}

/** AI credit window as reported by the API (1 credit ≈ 1 character). */
export interface CreditInfo {
  plan: 'free' | 'pro'
  balance: number
  granted: number
  expiresAt: string | null
}

interface ChatResponse {
  reply?: string
  toolCalls?: AgentToolCall[]
  error?: string
  credits?: CreditInfo
}

interface UseAgentOptions {
  context: AgentContext | null
  onToolCall: (call: AgentToolCall) => Promise<unknown>
}

const MAX_ROUNDS = 5
/** Cap on how many prior chat messages are sent to the API per turn. Keeps
 * token usage bounded in long conversations (especially hands-free live mode);
 * ~8 exchanges is plenty of context for logging/stat questions. */
const MAX_HISTORY_MESSAGES = 16
/** Auto-exit live mode after this much silence, to protect battery + privacy. */
const LIVE_IDLE_MS = 45_000
/** Discard captured clips smaller than this (noise/taps) without transcribing. */
const MIN_CLIP_BYTES = 1200

/** localStorage key + caps for persisting the conversation across reloads. */
const CHAT_STORAGE_KEY = 'bahon-agent-chat'
const MAX_PERSIST_MESSAGES = 100
const MAX_PERSIST_HISTORY = 40

interface PersistedChat {
  messages: AgentMessage[]
  apiHistory: { role: 'user' | 'assistant'; content: string }[]
}

function loadPersistedChat(): PersistedChat {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return { messages: [], apiHistory: [] }
    const data = JSON.parse(raw) as Partial<PersistedChat>
    return {
      messages: Array.isArray(data.messages) ? data.messages : [],
      apiHistory: Array.isArray(data.apiHistory) ? data.apiHistory : [],
    }
  } catch {
    return { messages: [], apiHistory: [] }
  }
}

function savePersistedChat(messages: AgentMessage[], apiHistory: PersistedChat['apiHistory']): void {
  try {
    const payload: PersistedChat = {
      // Drop image data URLs — they can be large and the thumbnail is ephemeral.
      messages: messages.slice(-MAX_PERSIST_MESSAGES).map((m) =>
        m.image ? { ...m, image: undefined } : m,
      ),
      apiHistory: apiHistory.slice(-MAX_PERSIST_HISTORY),
    }
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

function clearPersistedChat(): void {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Destructive tools that must be confirmed by the user before they run. */
const CONFIRM_REQUIRED = new Set(['delete_recent_log', 'delete_vehicle', 'clear_all_data'])

/** Maps a tool name to a status token used for the i18n label, or null when
 * the tool should not surface a status line (read-only tools). */
function statusToken(name: string): 'saved' | 'updated' | 'navigating' | 'deleted' | 'cleared' | null {
  if (name === 'navigate_to') return 'navigating'
  if (name === 'clear_all_data') return 'cleared'
  if (name.startsWith('delete_')) return 'deleted'
  if (name.startsWith('update_')) return 'updated'
  if (name.startsWith('add_')) return 'saved'
  return null
}

/** Builds the confirm card headline key + summary for a destructive tool. */
function destructiveTitleKey(call: AgentToolCall): string {
  if (call.name === 'delete_vehicle') return 'agent.confirm_delete_vehicle'
  if (call.name === 'clear_all_data') return 'agent.confirm_clear_all'
  return 'agent.confirm_delete_log'
}

/** True when a tool result string represents a successful write ("ok"). Reads
 * return JSON and needs-info returns a question — neither should show a status. */
function isOk(content: string): boolean {
  return /^\s*ok\s*$/i.test(content)
}
function isError(content: string): boolean {
  return /^\s*error\b/i.test(content)
}

function newMessage(
  role: AgentMessage['role'],
  content: string,
  extra?: Partial<Pick<AgentMessage, 'image' | 'confirm'>>,
): AgentMessage {
  return { id: crypto.randomUUID(), role, content, ts: Date.now(), ...extra }
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

/** Structured data returned by POST /api/vision (mirrors worker VisionExtract). */
interface VisionExtract {
  kind: 'odometer' | 'fuel_receipt' | 'document' | 'unknown'
  odometer?: number
  volumeLitres?: number
  pricePerLitre?: number
  totalCost?: number
  stationName?: string
  date?: string
  documentType?: string
  expiryDate?: string
  title?: string
  confidence?: number
  note?: string
}

/** Shrinks an image to ≤1024px JPEG to bound the upload, returning both a Blob
 * (for the API) and a data URL (for the in-chat thumbnail). */
async function downscaleImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file)
  const max = 1024
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no_canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no_blob'))), 'image/jpeg', 0.8),
  )
  return { blob, dataUrl }
}

/** Turns a vision extract into a pending confirm card (tool call + preview
 * fields), or null when nothing usable was found. */
function buildConfirmFromExtract(
  ex: VisionExtract | undefined,
  ctx: AgentContext,
): PendingConfirm | null {
  if (!ex) return null
  const fields: ConfirmField[] = []
  const push = (labelKey: string, value: string | number | undefined, suffix = '') => {
    if (value !== undefined && value !== '') fields.push({ labelKey, value: `${value}${suffix}` })
  }
  const id = () => crypto.randomUUID()

  const hasFuel = ex.volumeLitres || ex.pricePerLitre || ex.totalCost
  if (ex.kind === 'fuel_receipt' || (ex.kind !== 'odometer' && ex.kind !== 'document' && hasFuel)) {
    if (!hasFuel) return null
    push('agent.field_litres', ex.volumeLitres, ` ${ctx.volumeUnit}`)
    push('agent.field_price', ex.pricePerLitre)
    push('agent.field_total', ex.totalCost)
    push('agent.field_odometer', ex.odometer, ` ${ctx.distanceUnit}`)
    push('agent.field_date', ex.date)
    push('agent.field_station', ex.stationName)
    return {
      kind: 'extract',
      titleKey: 'agent.confirm_fuel',
      fields,
      call: {
        id: id(),
        name: 'add_fuel_log',
        input: clean({
          volumeLitres: ex.volumeLitres,
          pricePerLitre: ex.pricePerLitre,
          totalCost: ex.totalCost,
          odometer: ex.odometer,
          date: ex.date,
          stationName: ex.stationName,
        }),
      },
    }
  }

  if (ex.kind === 'odometer' || (ex.odometer && !ex.expiryDate)) {
    if (!ex.odometer) return null
    push('agent.field_odometer', ex.odometer, ` ${ctx.distanceUnit}`)
    return {
      kind: 'extract',
      titleKey: 'agent.confirm_odometer',
      fields,
      call: { id: id(), name: 'update_vehicle', input: clean({ odometer: ex.odometer }) },
    }
  }

  if (ex.kind === 'document' || ex.expiryDate) {
    if (!ex.expiryDate) return null
    push('agent.field_doc_type', ex.documentType ?? ex.title)
    push('agent.field_expiry', ex.expiryDate)
    return {
      kind: 'extract',
      titleKey: 'agent.confirm_document',
      fields,
      call: {
        id: id(),
        name: 'add_document',
        input: clean({ type: ex.documentType, title: ex.title, expiryDate: ex.expiryDate }),
      },
    }
  }
  return null
}

/** Drops undefined values so tool input stays clean. */
function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== '') out[k] = v
  return out
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
  // Chat history sent to the API (user/assistant text only, no status lines).
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  // Hydrate the conversation from localStorage so it survives reloads / PWA
  // restarts (status is intentionally reset — nothing is in-flight after a load).
  const [messages, setMessages] = useState<AgentMessage[]>(() => {
    const persisted = loadPersistedChat()
    apiHistoryRef.current = persisted.apiHistory
    return persisted.messages
  })
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [liveMode, setLiveMode] = useState(false)
  const [credits, setCredits] = useState<CreditInfo | null>(null)
  // Voice (live/hands-free mode) is Pro-only; text chat stays free+pro.
  const isPro = useAuthStore((s) => s.entitlements?.pro ?? false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Persist whenever the visible conversation changes (apiHistoryRef is updated
  // alongside messages, so this captures both).
  useEffect(() => {
    savePersistedChat(messages, apiHistoryRef.current)
  }, [messages])

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

  /** Handles a 402 no-credits response: records the drained window and fails
   * with the plan-appropriate message. Returns true when it was a 402. */
  const failNoCredits = useCallback(
    async (res: Response): Promise<boolean> => {
      if (res.status !== 402) return false
      let plan: CreditInfo['plan'] = 'free'
      try {
        const body = (await res.json()) as { credits?: CreditInfo }
        if (body.credits) {
          setCredits(body.credits)
          plan = body.credits.plan
        }
      } catch {
        /* body optional */
      }
      fail(plan === 'pro' ? 'agent.no_credits_pro' : 'agent.no_credits_free')
      return true
    },
    [fail],
  )

  /** Fetches the live credit balance (also issues the first free/daily grant
   * server-side). Called when the sheet opens for a signed-in user. */
  const refreshCredits = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) return
    try {
      const res = await apiFetch('/api/credits')
      if (!res.ok) return
      const body = (await res.json()) as { credits?: CreditInfo }
      if (body.credits) setCredits(body.credits)
    } catch {
      /* non-fatal — the balance just stays unknown */
    }
  }, [])

  const postChat = useCallback(
    async (
      toolResults?: { toolUseId: string; content: string }[],
    ): Promise<ChatResponse> => {
      // Send only the recent tail of the conversation to bound token usage.
      // Keep the window well-formed by starting it on a user turn.
      let sent = apiHistoryRef.current.slice(-MAX_HISTORY_MESSAGES)
      if (sent.length > 0 && sent[0].role !== 'user') sent = sent.slice(1)
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: sent,
          context,
          toolResults,
        }),
      })
      if (res.status === 403) throw new Error('pro_required')
      if (res.status === 401) throw new Error('login_required')
      if (res.status === 402) {
        let plan: CreditInfo['plan'] = 'free'
        try {
          const body = (await res.json()) as { credits?: CreditInfo }
          if (body.credits) {
            setCredits(body.credits)
            plan = body.credits.plan
          }
        } catch {
          /* body optional */
        }
        throw new Error(`no_credits_${plan}`)
      }
      if (!res.ok) throw new Error(`chat_${res.status}`)
      const data = (await res.json()) as ChatResponse
      if (data.credits) setCredits(data.credits)
      return data
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
            // Destructive tools pause the loop and ask the user first.
            if (CONFIRM_REQUIRED.has(call.name)) {
              setMessages((prev) => [
                ...prev,
                newMessage('confirm', '', {
                  confirm: { kind: 'destructive', call, titleKey: destructiveTitleKey(call) },
                }),
              ])
              setStatus('idle')
              return
            }
            const content = stringifyResult(await onToolCall(call))
            // Reflect the ACTUAL outcome: only show a status when the executor
            // confirmed "ok". Needs-info (e.g. missing litres) and read results
            // show no status line; a real failure shows the failure line.
            const token = statusToken(call.name)
            if (token) {
              if (isOk(content)) setMessages((prev) => [...prev, newMessage('tool_status', token)])
              else if (isError(content)) setMessages((prev) => [...prev, newMessage('tool_status', 'failed')])
            }
            results.push({ toolUseId: call.id, content })
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
      else if (code === 'no_credits_pro') fail('agent.no_credits_pro')
      else if (code === 'no_credits_free') fail('agent.no_credits_free')
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

  // Mark a confirm card done (disables its buttons) without touching others.
  const markConfirmDone = useCallback(
    (messageId: string, done: PendingConfirm['done']) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.confirm ? { ...m, confirm: { ...m.confirm, done } } : m,
        ),
      )
    },
    [],
  )

  // Resolve a pending confirm card: run the tool on approval, or drop it.
  const resolveConfirm = useCallback(
    async (messageId: string, confirm: PendingConfirm, approved: boolean): Promise<void> => {
      if (confirm.done) return
      if (!approved) {
        markConfirmDone(messageId, 'cancelled')
        setMessages((prev) => [...prev, newMessage('tool_status', 'cancelled')])
        return
      }
      markConfirmDone(messageId, 'confirmed')
      setStatus('thinking')
      try {
        const content = stringifyResult(await onToolCall(confirm.call))
        const token = statusToken(confirm.call.name)
        if (token && isOk(content)) {
          setMessages((prev) => [...prev, newMessage('tool_status', token)])
        } else {
          setMessages((prev) => [
            ...prev,
            newMessage('tool_status', 'failed'),
            ...(isError(content) ? [newMessage('assistant', content)] : []),
          ])
        }
        setStatus('idle')
      } catch {
        fail('agent.error_generic')
      }
    },
    [onToolCall, markConfirmDone, fail],
  )

  // Upload a photo, extract structured data, and surface a confirm-to-save card.
  const sendImage = useCallback(
    async (file: File): Promise<void> => {
      const ctx = contextRef.current
      if (!ctx) return
      if (!navigator.onLine) {
        fail('agent.error_offline')
        return
      }
      let prepared: { blob: Blob; dataUrl: string }
      try {
        prepared = await downscaleImage(file)
      } catch {
        fail('agent.error_generic')
        return
      }
      setMessages((prev) => [
        ...prev,
        newMessage('user', 'agent.image_sent', { image: prepared.dataUrl }),
      ])
      setStatus('scanning')
      try {
        const form = new FormData()
        form.append('image', prepared.blob, 'photo.jpg')
        form.append('hint', 'auto')
        const res = await apiFetch('/api/vision', { method: 'POST', body: form })
        if (res.status === 403) return fail('agent.pro_required')
        if (res.status === 401) return fail('agent.login_required')
        if (await failNoCredits(res)) return
        if (!res.ok) throw new Error(`vision_${res.status}`)
        const { extract, credits: cr } = (await res.json()) as {
          extract?: VisionExtract
          credits?: CreditInfo
        }
        if (cr) setCredits(cr)
        const confirm = buildConfirmFromExtract(extract, ctx)
        if (!confirm) {
          setMessages((prev) => [...prev, newMessage('assistant', 'agent.image_no_data')])
          setStatus('idle')
          return
        }
        setMessages((prev) => [...prev, newMessage('confirm', '', { confirm })])
        setStatus('idle')
      } catch {
        fail('agent.error_generic')
      }
    },
    [fail, failNoCredits],
  )

  const startVoice = useCallback(async () => {
    if (!context) return
    if (!isPro) {
      fail('agent.pro_required')
      return
    }
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
          if (await failNoCredits(res)) return
          if (!res.ok) throw new Error(`transcribe_${res.status}`)
          const { transcript, credits: cr } = (await res.json()) as {
            transcript?: string
            credits?: CreditInfo
          }
          if (cr) setCredits(cr)
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
  }, [context, isPro, fail, failNoCredits, sendText])

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
      if (await failNoCredits(res)) { stopLive(); return }
      if (!res.ok) throw new Error(`transcribe_${res.status}`)
      const { transcript, credits: cr } = (await res.json()) as {
        transcript?: string
        credits?: CreditInfo
      }
      if (cr) setCredits(cr)
      if (transcript && transcript.trim()) await sendText(transcript.trim())
      resumeListening()
    } catch {
      fail('agent.error_generic')
      stopLive()
    }
  }, [fail, failNoCredits, sendText, resumeListening, stopLive])
  handleUtteranceRef.current = handleUtterance

  const startLive = useCallback(async () => {
    const context = contextRef.current
    if (!context || liveModeRef.current) return
    if (!isPro) { fail('agent.pro_required'); return }
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
  }, [isPro, fail, armIdleTimer, clearIdleTimer])

  const reset = useCallback(() => {
    stopVoice()
    stopLive()
    apiHistoryRef.current = []
    setMessages([])
    setStatus('idle')
    clearPersistedChat()
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

  return {
    messages,
    status,
    liveMode,
    credits,
    refreshCredits,
    sendText,
    sendImage,
    resolveConfirm,
    startVoice,
    stopVoice,
    startLive,
    stopLive,
    reset,
  }
}
