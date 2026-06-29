import styles from './BottomNav.module.css'

type NavTab = 'stats' | 'reminders'

interface BottomNavProps {
  activeTab?: NavTab
  onStats: () => void
  onAdd: () => void
  onReminders: () => void
}

export function BottomNav({ activeTab, onStats, onAdd, onReminders }: BottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <button
        className={`${styles.navItem} ${activeTab === 'stats' ? styles.active : ''}`}
        onClick={onStats}
        aria-label="Stats"
        aria-current={activeTab === 'stats' ? 'page' : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M3 17L8 11L12 14L19 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.label}>Stats</span>
      </button>

      <div className={styles.fabWrapper}>
        <button
          className={styles.fab}
          onClick={onAdd}
          aria-label="Add log entry"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <button
        className={`${styles.navItem} ${activeTab === 'reminders' ? styles.active : ''}`}
        onClick={onReminders}
        aria-label="Reminders"
        aria-current={activeTab === 'reminders' ? 'page' : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M11 3a6 6 0 016 6v4l1.5 2.5h-15L5 13V9a6 6 0 016-6z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M9 17.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <span className={styles.label}>Reminders</span>
      </button>
    </nav>
  )
}
