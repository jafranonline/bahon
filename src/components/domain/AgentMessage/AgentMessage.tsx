import { useTranslation } from '@hooks/useTranslation'
import type { AgentMessage as AgentMessageType } from '@hooks/useAgent'
import styles from './AgentMessage.module.css'

interface AgentMessageProps {
  message: AgentMessageType
}

/** Renders a single chat entry: a user/assistant bubble, or a centred
 * tool-status line. Assistant content that is an i18n key (error strings) and
 * tool-status tokens are translated; ordinary text is shown as-is. */
export function AgentMessage({ message }: AgentMessageProps) {
  const { t } = useTranslation()

  if (message.role === 'tool_status') {
    return (
      <div className={styles.status} role="status">
        {t(`agent.tool_status_${message.content}`)}
      </div>
    )
  }

  const isUser = message.role === 'user'
  const text = message.content.startsWith('agent.')
    ? t(message.content)
    : message.content

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}>
      <div className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}>
        {text}
      </div>
    </div>
  )
}
