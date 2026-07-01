import { useTranslation } from '@hooks/useTranslation'
import type { AgentMessage as AgentMessageType, PendingConfirm } from '@hooks/useAgent'
import styles from './AgentMessage.module.css'

interface AgentMessageProps {
  message: AgentMessageType
  /** Resolve a confirm card. Only used for `confirm` rows. */
  onConfirm?: (messageId: string, confirm: PendingConfirm, approved: boolean) => void
}

/** Renders a single chat entry: a user/assistant bubble, a centred tool-status
 * line, or a Confirm/Cancel card for destructive or image-extracted actions. */
export function AgentMessage({ message, onConfirm }: AgentMessageProps) {
  const { t } = useTranslation()

  if (message.role === 'tool_status') {
    return (
      <div className={styles.status} role="status">
        {t(`agent.tool_status_${message.content}`)}
      </div>
    )
  }

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
              className={`${styles.confirmBtn} ${c.kind === 'destructive' ? styles.confirmBtnDanger : ''}`}
              onClick={() => onConfirm?.(message.id, c, true)}
            >
              {t(c.kind === 'destructive' ? 'agent.confirm_delete' : 'agent.confirm_save')}
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
        {text && <span>{text}</span>}
      </div>
    </div>
  )
}
