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
  const { messages, status, sendText, startVoice, stopVoice } = useAgent({
    context,
    onToolCall,
  })
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

  const listening = status === 'listening'
  const busy = status === 'thinking' || status === 'transcribing'

  const handleSend = () => {
    if (!draft.trim()) return
    sendText(draft)
    setDraft('')
  }

  const handleMic = () => {
    if (listening) stopVoice()
    else void startVoice()
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

        <div className={styles.composer}>
          <input
            className={styles.input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder={listening ? t('agent.listening') : t('agent.placeholder')}
            aria-label={t('agent.placeholder')}
            disabled={busy}
          />
          <button
            className={`${styles.mic} ${listening ? styles.micActive : ''}`}
            onClick={handleMic}
            aria-label={listening ? t('agent.stop') : t('agent.tap_to_speak')}
            aria-pressed={listening}
            type="button"
            disabled={busy}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M6 11a6 6 0 0012 0M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className={styles.send}
            onClick={handleSend}
            aria-label={t('agent.send')}
            type="button"
            disabled={busy || !draft.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        </>
        )}
      </section>
    </>
  )
}
