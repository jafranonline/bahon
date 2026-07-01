import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@hooks/useTranslation'
import { useAgent, type AgentContext, type AgentToolCall } from '@hooks/useAgent'
import { AgentMessage } from '../AgentMessage/AgentMessage'
import styles from './AgentSheet.module.css'

interface AgentSheetProps {
  open: boolean
  onClose: () => void
  context: AgentContext | null
  onToolCall: (call: AgentToolCall) => Promise<unknown>
  isPro: boolean
}

export function AgentSheet({ open, onClose, context, onToolCall, isPro }: AgentSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { messages, status, liveMode, sendText, stopVoice, startLive, stopLive } =
    useAgent({ context, onToolCall })
  const [draft, setDraft] = useState('')
  const listEndRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to the newest message / typing indicator.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

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

  const busy = status === 'thinking' || status === 'transcribing'
  const hasText = draft.trim().length > 0

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
          <span className={styles.title}>{t('agent.title')}</span>
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
        </header>

        {!isPro ? (
          <div className={styles.gate}>
            <span className={styles.gateIcon} aria-hidden="true">✨</span>
            <p className={styles.gateTitle}>{t('agent.gate_title')}</p>
            <p className={styles.gateText}>{t('agent.gate_text')}</p>
            <button
              className={styles.gateCta}
              type="button"
              onClick={() => { onClose(); navigate('/account') }}
            >
              {t('agent.gate_cta')}
            </button>
          </div>
        ) : (
        <>
        <div className={styles.messages}>
          {messages.length === 0 && (
            <p className={styles.empty}>{t('agent.empty_hint')}</p>
          )}
          {messages.map((m) => (
            <AgentMessage key={m.id} message={m} />
          ))}
          {(status === 'thinking' || status === 'transcribing') && (
            <div className={styles.typing} role="status" aria-label={t('agent.thinking')}>
              <span />
              <span />
              <span />
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        {liveMode ? (
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
        </>
        )}
      </section>
    </>
  )
}
