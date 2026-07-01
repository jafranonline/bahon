import { useTranslation } from '@hooks/useTranslation'
import styles from './AgentFAB.module.css'

interface AgentFABProps {
  onClick: () => void
}

/** Floating button that opens the AI agent chat sheet. Rendered by AppShell
 * only when a vehicle is active and the sheet is closed. */
export function AgentFAB({ onClick }: AgentFABProps) {
  const { t } = useTranslation()
  return (
    <button
      className={styles.fab}
      onClick={onClick}
      aria-label={t('agent.title')}
      type="button"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 11.5a8.5 8.5 0 01-12.28 7.6L4 20l.9-3.72A8.5 8.5 0 1120 11.5z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M12 7.5v2M12 9.5a1.75 1.75 0 011.75 1.75v.5a1.75 1.75 0 11-3.5 0v-.5A1.75 1.75 0 0112 9.5zM9.5 14.2a3.2 3.2 0 005 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
