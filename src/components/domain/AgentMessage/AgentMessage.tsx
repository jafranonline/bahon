import { useEffect, useState } from 'react'
import { useTranslation } from '@hooks/useTranslation'
import type { AgentMessage as AgentMessageType, PendingConfirm } from '@hooks/useAgent'
import styles from './AgentMessage.module.css'

interface AgentMessageProps {
  message: AgentMessageType
  /** Resolve a confirm card. Only used for `confirm` rows. */
  onConfirm?: (messageId: string, confirm: PendingConfirm, approved: boolean) => void
  /** Called on every reveal frame while a reply is typing, so the chat can
   * keep the growing bubble scrolled into view. */
  onTypingTick?: () => void
}

const REDUCED_MOTION = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Reveals `text` character-by-character over an adaptive duration (capped so
 * long replies don't take forever). Runs once per mount — callers control
 * replay by mounting a fresh instance (see `key` in the assistant bubble). */
function useTypewriter(text: string, enabled: boolean, onTick?: () => void): string {
  const [count, setCount] = useState(enabled && !REDUCED_MOTION() ? 0 : text.length)

  useEffect(() => {
    if (!enabled || REDUCED_MOTION()) return
    let raf = 0
    const duration = Math.min(Math.max(text.length * 14, 150), 2200)
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setCount(Math.round(progress * text.length))
      onTick?.()
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount by design
  }, [])

  return text.slice(0, count)
}

/** Assistant bubble text with the typewriter effect applied when `animate`. */
function AssistantText({ text, animate, onTypingTick }: { text: string; animate: boolean; onTypingTick?: () => void }) {
  const shown = useTypewriter(text, animate, onTypingTick)
  return <span>{shown}</span>
}

/** Renders a single chat entry: a user/assistant bubble, a centred tool-status
 * line, or a Confirm/Cancel card for destructive or image-extracted actions. */
export function AgentMessage({ message, onConfirm, onTypingTick }: AgentMessageProps) {
  const { t } = useTranslation()

  if (message.role === 'tool_status') {
    return (
      <div className={styles.status} role="status">
        {t(`agent.tool_status_${message.content}`)}
      </div>
    )
  }

  // Destructive confirms are shown as a blocking Modal by AgentSheet instead of
  // an inline bubble — a scrollable chat card is too easy to miss or dismiss
  // by accident for a delete/clear-data action.
  if (message.role === 'confirm' && message.confirm?.kind === 'destructive') return null

  if (message.role === 'confirm' && message.confirm) {
    const c = message.confirm
    return (
      <div className={styles.confirm} role="group" aria-label={t(c.titleKey)}>
        <p className={styles.confirmTitle}>{t(c.titleKey)}</p>
        {c.fields && c.fields.length > 0 && (
          <dl className={styles.fields}>
            {c.fields.map((f, i) => (
              <div className={styles.fieldRow} key={i}>
                <dt className={styles.fieldLabel}>{t(f.labelKey)}</dt>
                <dd className={styles.fieldValue}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {c.done ? (
          <p className={styles.confirmDone}>
            {t(c.done === 'confirmed' ? 'agent.confirm_done' : 'agent.confirm_cancelled')}
          </p>
        ) : (
          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => onConfirm?.(message.id, c, false)}
            >
              {t('agent.cancel')}
            </button>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={() => onConfirm?.(message.id, c, true)}
            >
              {t('agent.confirm_save')}
            </button>
          </div>
        )}
      </div>
    )
  }

  const isUser = message.role === 'user'
  const text = message.content.startsWith('agent.') ? t(message.content) : message.content

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}>
      <div className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}>
        {message.image && (
          <img className={styles.thumb} src={message.image} alt={t('agent.image_sent')} />
        )}
        {text && (
          isUser
            ? <span>{text}</span>
            : (
              <AssistantText
                key={message.id}
                text={text}
                animate={message.animate === true}
                onTypingTick={onTypingTick}
              />
            )
        )}
      </div>
    </div>
  )
}
