import { useUIStore } from '@store/uiStore'
import { useVehicleStore } from '@store/vehicleStore'
import { useSettingsStore } from '@store/settingsStore'
import { useAuthStore } from '@store/authStore'
import { useTranslation } from '@hooks/useTranslation'
import styles from './AgentButton.module.css'

/**
 * Header AI-assistant button — opens the shared AgentSheet. Used on screens that
 * have no BottomNav (the log/add forms) so the assistant is reachable there too.
 * Mirrors BottomNav's enable rule: needs an active vehicle; signed-in users can
 * hide it via settings, anonymous users always see it (as a sign-in prompt).
 */
export function AgentButton() {
  const { t } = useTranslation()
  const setAgentOpen = useUIStore((s) => s.setAgentOpen)
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const showAgentButton = useSettingsStore((s) => s.showAgentButton ?? true)
  const signedIn = useAuthStore((s) => s.status === 'authenticated')

  const agentEnabled = Boolean(activeVehicleId) && (signedIn ? showAgentButton : true)
  if (!agentEnabled) return null

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={() => setAgentOpen(true)}
      aria-label={t('agent.title')}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
