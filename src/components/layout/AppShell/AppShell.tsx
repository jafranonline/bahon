import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSettingsStore } from '@store/settingsStore'
import { useVehicleStore } from '@store/vehicleStore'
import { useVehicle } from '@db/queries/useVehicles'
import { useTheme } from '@hooks/useTheme'
import { useNotifications } from '@hooks/useNotifications'
import type { AgentContext, AgentToolCall } from '@hooks/useAgent'
import { InstallBanner } from '../InstallBanner/InstallBanner'
import { AgentFAB } from '../../domain/AgentFAB/AgentFAB'
import { AgentSheet } from '../../domain/AgentSheet/AgentSheet'
import i18n from '@i18n/config'
import styles from './AppShell.module.css'

export function AppShell() {
  useTheme()

  const language = useSettingsStore((s) => s.language)
  const currency = useSettingsStore((s) => s.currency)
  const distanceUnit = useSettingsStore((s) => s.distanceUnit)
  const volumeUnit = useSettingsStore((s) => s.volumeUnit)

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language)
    }
  }, [language])

  const { requestPermission } = useNotifications()
  void requestPermission()

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const vehicle = useVehicle(activeVehicleId ?? '')

  const [agentOpen, setAgentOpen] = useState(false)

  const agentContext = useMemo<AgentContext | null>(() => {
    if (!vehicle) return null
    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleType: vehicle.type,
      fuelType: vehicle.fuelType,
      currentOdometer: vehicle.odometer,
      today: new Date().toISOString().slice(0, 10),
      language,
      currency,
      distanceUnit,
      volumeUnit,
    }
  }, [vehicle, language, currency, distanceUnit, volumeUnit])

  // TASK-058 replaces this stub with real Dexie/settings/navigation execution.
  const onToolCall = useCallback(async (_call: AgentToolCall): Promise<unknown> => {
    return 'ok'
  }, [])

  return (
    <div className={styles.shell}>
      <Outlet />
      <InstallBanner />
      {agentContext && !agentOpen && (
        <AgentFAB onClick={() => setAgentOpen(true)} />
      )}
      <AgentSheet
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        context={agentContext}
        onToolCall={onToolCall}
      />
    </div>
  )
}
