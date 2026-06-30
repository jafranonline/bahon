import { useTranslation } from '@hooks/useTranslation'
import styles from './BottomNav.module.css'

type NavTab = 'home' | 'reminders'

interface BottomNavProps {
  activeTab?: NavTab
  onHome: () => void
  onAdd: () => void
  onReminders: () => void
  reminderCount?: number
}

export function BottomNav({ activeTab, onHome, onAdd, onReminders, reminderCount = 0 }: BottomNavProps) {
  const { t } = useTranslation()
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <button
        className={`${styles.navItem} ${activeTab === 'home' ? styles.active : ''}`}
        onClick={onHome}
        aria-label={t('nav.home')}
        aria-current={activeTab === 'home' ? 'page' : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M3 10.5L11 3l8 7.5V19a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V10.5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
        <span className={styles.label}>{t('nav.home')}</span>
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
        aria-label={reminderCount > 0 ? `${t('nav.reminders')} (${reminderCount})` : t('nav.reminders')}
        aria-current={activeTab === 'reminders' ? 'page' : undefined}
      >
        <div className={styles.iconWrap}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 3a6 6 0 016 6v4l1.5 2.5h-15L5 13V9a6 6 0 016-6z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M9 17.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          {reminderCount > 0 && (
            <span className={styles.badge} aria-hidden="true">
              {reminderCount > 9 ? '9+' : reminderCount}
            </span>
          )}
        </div>
        <span className={styles.label}>{t('nav.reminders')}</span>
      </button>
    </nav>
  )
}
