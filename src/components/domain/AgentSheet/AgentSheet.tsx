import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@hooks/useTranslation'
import { useAuthStore } from '@store/authStore'
import { useAgent, type AgentContext, type AgentToolCall } from '@hooks/useAgent'
import { ConfirmDialog } from '@components/composed/ConfirmDialog'
import { AgentMessage } from '../AgentMessage/AgentMessage'
import styles from './AgentSheet.module.css'

/** The agent's avatar — a gradient sparkle mark with a live "online" dot. */
function AgentAvatar() {
  return (
    <span className={styles.avatar} aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M11.5 3.2c.55 3.9 2.4 5.75 6.3 6.3-3.9.55-5.75 2.4-6.3 6.3-.55-3.9-2.4-5.75-6.3-6.3 3.9-.55 5.75-2.4 6.3-6.3z"
          fill="currentColor"
        />
        <path
          d="M18.3 14.2c.24 1.7 1.05 2.5 2.75 2.75-1.7.24-2.51 1.05-2.75 2.75-.24-1.7-1.05-2.51-2.75-2.75 1.7-.24 2.51-1.05 2.75-2.75z"
          fill="currentColor"
        />
      </svg>
      <span className={styles.onlineDot} />
    </span>
  )
}

interface AgentSheetProps {
  open: boolean
  onClose: () => void
  context: AgentContext | null
  onToolCall: (call: AgentToolCall) => Promise<unknown>
}

export function AgentSheet({ open, onClose, context, onToolCall }: AgentSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // The AI runs on server-metered credits — any signed-in user can chat.
  const signedIn = useAuthStore((s) => s.status === 'authenticated')
  const {
    messages,
    status,
    liveMode,
    credits,
    refreshCredits,
    sendText,
    sendImage,
    resolveConfirm,
    stopVoice,
    startLive,
    stopLive,
    reset,
  } = useAgent({ context, onToolCall })
  const [draft, setDraft] = useState('')
  const listEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Auto-scroll to the newest message / typing indicator — only while the sheet
  // is open. When closed, the sheet is translated fully off-screen (~88dvh
  // below), so scrollIntoView would scroll the whole app shell up to reveal it,
  // shoving the home content off the top of the viewport (blank screen on load).
  // `block: 'nearest'` also keeps the scroll inside the message list.
  useEffect(() => {
    if (!open) return
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [open, messages, status])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Release the mic / live loop whenever the sheet is closed.
  useEffect(() => {
    if (!open) {
      stopLive()
      stopVoice()
    }
  }, [open, stopLive, stopVoice])

  // Show a live credit balance whenever the sheet opens (also triggers the
  // first free/daily grant server-side).
  useEffect(() => {
    if (open && signedIn) void refreshCredits()
  }, [open, signedIn, refreshCredits])

  const busy = status === 'thinking' || status === 'transcribing' || status === 'scanning'
  const hasText = draft.trim().length > 0

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (file) void sendImage(file)
  }

  // Keep the composer focused for uninterrupted typing: on open, and again once
  // a send finishes (the input is disabled while busy, so re-focus when idle).
  useEffect(() => {
    if (open && signedIn && !liveMode && !busy) {
      inputRef.current?.focus()
    }
  }, [open, signedIn, liveMode, busy])

  const liveStatusText =
    status === 'transcribing' ? t('agent.live_transcribing')
    : status === 'thinking' ? t('agent.thinking')
    : status === 'live_capturing' ? t('agent.live_capturing')
    : t('agent.live_listening')

  const handleSend = () => {
    if (!draft.trim()) return
    sendText(draft)
    setDraft('')
  }

  // Destructive tool calls (delete/clear) pause the agent loop and block on a
  // Modal here instead of an inline chat card, so the user can't miss or
  // accidentally scroll past a delete confirmation.
  const pendingDestructive = messages.find(
    (m) => m.role === 'confirm' && m.confirm?.kind === 'destructive' && !m.confirm.done,
  )

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('agent.title')}
        aria-hidden={!open}
      >
        <header className={styles.header}>
          <div className={styles.identity}>
            <AgentAvatar />
            <span className={styles.identityText}>
              <span className={styles.name}>{t('agent.agent_name')}</span>
              <span className={styles.presence}>
                <span className={styles.presenceDot} aria-hidden="true" />
                {signedIn && credits != null
                  ? t('agent.credits_left', { count: credits.balance })
                  : t('agent.online')}
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {signedIn && messages.length > 0 && (
              <button
                className={styles.close}
                onClick={reset}
                aria-label={t('agent.clear')}
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button
              className={styles.close}
              onClick={onClose}
              aria-label={t('common.close')}
              type="button"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <p className={styles.empty}>{signedIn ? t('agent.empty_hint') : t('agent.gate_text')}</p>
          )}
          {messages.map((m) => (
            <AgentMessage
              key={m.id}
              message={m}
              onConfirm={resolveConfirm}
              onTypingTick={() => listEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' })}
            />
          ))}
          {(status === 'thinking' || status === 'transcribing' || status === 'scanning') && (
            <div
              className={styles.typing}
              role="status"
              aria-label={status === 'scanning' ? t('agent.scanning') : t('agent.thinking')}
            >
              <span />
              <span />
              <span />
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        {!signedIn ? (
          // Anonymous: the chat modal is shown but locked — an account is
          // required so credits can be metered server-side.
          <div className={styles.lockedBar}>
            <span className={styles.lockIcon} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <button
              className={styles.lockedCta}
              type="button"
              onClick={() => { onClose(); navigate('/auth') }}
            >
              {t('agent.locked_signin')}
            </button>
          </div>
        ) : liveMode ? (
          // Live (hands-free) mode active — the input is replaced by the live UI.
          <div className={`${styles.liveBar} ${status === 'live_listening' ? styles.liveBarReady : ''}`}>
            <span className={styles.liveIndicator} aria-hidden="true">
              <span className={styles.liveDot} />
            </span>
            <span className={styles.liveStatus} role="status">{liveStatusText}</span>
            <button className={styles.liveStop} onClick={stopLive} type="button">
              {t('agent.live_stop')}
            </button>
          </div>
        ) : (
          <div className={styles.composer}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePickImage}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              className={styles.attach}
              onClick={() => fileRef.current?.click()}
              aria-label={t('agent.attach_image')}
              type="button"
              disabled={busy}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                <path d="M5 17l4.5-4.5 3 3L16 12l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <input
              ref={inputRef}
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
              placeholder={t('agent.placeholder')}
              aria-label={t('agent.placeholder')}
              disabled={busy}
              type="text"
              maxLength={500}
              name="agent-message"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
            />
            {hasText ? (
              // Text typed → show Send.
              <button
                className={styles.send}
                onClick={handleSend}
                aria-label={t('agent.send')}
                type="button"
                disabled={busy}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              // Empty → show the live-voice button.
              <button
                className={styles.send}
                onClick={() => void startLive()}
                aria-label={t('agent.live_start')}
                type="button"
                disabled={busy}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12h2M9 7v10M12 4v16M15 8v8M20 12h-2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
      </section>

      {pendingDestructive?.confirm && (() => {
        const { id: messageId, confirm } = pendingDestructive
        return (
          <ConfirmDialog
            open
            title={t(confirm.titleKey)}
            confirmLabel={t('agent.confirm_delete')}
            cancelLabel={t('agent.cancel')}
            busy={busy}
            onConfirm={() => resolveConfirm(messageId, confirm, true)}
            onCancel={() => resolveConfirm(messageId, confirm, false)}
          />
        )
      })()}
    </>
  )
}
