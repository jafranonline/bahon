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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* Four-point "AI sparkle" — the modern, widely-recognised assistant glyph */}
        <path
          d="M11.5 3.2c.55 3.9 2.4 5.75 6.3 6.3-3.9.55-5.75 2.4-6.3 6.3-.55-3.9-2.4-5.75-6.3-6.3 3.9-.55 5.75-2.4 6.3-6.3z"
          fill="currentColor"
        />
        <path
          d="M18.3 14.2c.24 1.7 1.05 2.5 2.75 2.75-1.7.24-2.51 1.05-2.75 2.75-.24-1.7-1.05-2.51-2.75-2.75 1.7-.24 2.51-1.05 2.75-2.75z"
          fill="currentColor"
        />
      </svg>
    </button>
  )
}
