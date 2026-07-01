import { useTranslation } from '@hooks/useTranslation'
import { useUIStore } from '@store/uiStore'
import { useVehicleStore } from '@store/vehicleStore'
import { useSettingsStore } from '@store/settingsStore'
import { useAuthStore } from '@store/authStore'
import styles from './BottomNav.module.css'

type NavTab = 'home' | 'reminders'

interface BottomNavProps {
  activeTab?: NavTab
  onHome: () => void
  onAdd: () => void
  onReminders: () => void
  reminderCount?: number
}

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
  </svg>
)

/** Four-point "AI sparkle" — the recognisable assistant glyph. */
const SparkleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M11.5 3.2c.55 3.9 2.4 5.75 6.3 6.3-3.9.55-5.75 2.4-6.3 6.3-.55-3.9-2.4-5.75-6.3-6.3 3.9-.55 5.75-2.4 6.3-6.3z"
      fill="currentColor"
    />
    <path
      d="M18.3 14.2c.24 1.7 1.05 2.5 2.75 2.75-1.7.24-2.51 1.05-2.75 2.75-.24-1.7-1.05-2.51-2.75-2.75 1.7-.24 2.51-1.05 2.75-2.75z"
      fill="currentColor"
    />
  </svg>
)

export function BottomNav({ activeTab, onHome, onAdd, onReminders, reminderCount = 0 }: BottomNavProps) {
  const { t } = useTranslation()
  const setAgentOpen = useUIStore((s) => s.setAgentOpen)
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const showAgentButton = useSettingsStore((s) => s.showAgentButton ?? true)
  const isPro = useAuthStore((s) => s.entitlements?.pro ?? false)

  // The AI assistant is vehicle-scoped. Pro users can hide it via settings;
  // free users always see it (as an upsell) so long as a vehicle is active.
  const hasVehicle = Boolean(activeVehicleId)
  const agentEnabled = hasVehicle && (isPro ? showAgentButton : true)
  const proCenterAgent = agentEnabled && isPro // AI owns the centre, "+" demoted left
  const freeCornerAgent = agentEnabled && !isPro // "+" stays centre, AI floats corner

  const openAgent = () => setAgentOpen(true)

  return (
    <>
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.side}>
          {/* When the AI owns the centre, "+" moves to the left corner. */}
          {proCenterAgent && (
            <button
              className={styles.addMini}
              onClick={onAdd}
              aria-label="Add log entry"
              type="button"
            >
              <PlusIcon />
            </button>
          )}
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
        </div>

        <div className={styles.fabWrapper}>
          {proCenterAgent ? (
            <button
              className={`${styles.fab} ${styles.fabAi}`}
              onClick={openAgent}
              aria-label={t('agent.title')}
              type="button"
            >
              <SparkleIcon />
            </button>
          ) : (
            <button
              className={styles.fab}
              onClick={onAdd}
              aria-label="Add log entry"
              type="button"
            >
              <PlusIcon />
            </button>
          )}
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

      {/* Free tier: highlighted AI button floating in the bottom-right corner,
       * above the nav — an upsell entry point into the assistant. */}
      {freeCornerAgent && (
        <button
          className={styles.agentCorner}
          onClick={openAgent}
          aria-label={t('agent.title')}
          type="button"
        >
          <SparkleIcon />
        </button>
      )}
    </>
  )
}
