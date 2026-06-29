import styles from './TopBar.module.css'

interface TopBarProps {
  title: string
  subtitle?: string
  onBack?: () => void
  onSettings?: () => void
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, onBack, onSettings, actions }: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {onBack && (
          <button
            className={styles.iconBtn}
            onClick={onBack}
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.center}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>

      <div className={styles.right}>
        {actions}
        {onSettings && (
          <button
            className={styles.iconBtn}
            onClick={onSettings}
            aria-label="Open settings"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.1 4.1l1.06 1.06M14.84 14.84l1.06 1.06M4.1 15.9l1.06-1.06M14.84 5.16l1.06-1.06"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
