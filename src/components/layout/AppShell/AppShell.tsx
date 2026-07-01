import { useCallback, useEffect, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { useSettingsStore } from '@store/settingsStore'
import { useVehicleStore } from '@store/vehicleStore'
import { useVehicle, useVehicles } from '@db/queries/useVehicles'
import { useTheme } from '@hooks/useTheme'
import { useNotifications } from '@hooks/useNotifications'
import type { AgentContext, AgentToolCall } from '@hooks/useAgent'
import { useToolExecutor } from '@hooks/useToolExecutor'
import { useAuthStore } from '@store/authStore'
import { useUIStore } from '@store/uiStore'
import { syncNow } from '@/sync/syncEngine'
import { InstallBanner } from '../InstallBanner/InstallBanner'
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

  const isPro = useAuthStore((s) => s.entitlements?.pro ?? false)

  // Cloud sync triggers: when the user becomes Pro, and on app foreground.
  useEffect(() => {
    if (isPro) void syncNow()
  }, [isPro])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)
  const vehicles = useVehicles()
  const vehicle = useVehicle(activeVehicleId ?? '')

  // Ensure an active vehicle is always selected when vehicles exist (e.g. after
  // they arrive via sync or a logged-in onboarding, which never set one) — so
  // the AI assistant and other vehicle-scoped features are available.
  useEffect(() => {
    if (!vehicles) return
    const hasActive = activeVehicleId && vehicles.some((v) => v.id === activeVehicleId)
    if (!hasActive && vehicles.length > 0) {
      setActiveVehicle(vehicles[0].id)
    }
  }, [vehicles, activeVehicleId, setActiveVehicle])

  // The AI FAB lives inside the bottom nav (next to "+"); the open-state is
  // shared via uiStore so any nav-bearing screen can trigger it.
  const agentOpen = useUIStore((s) => s.agentOpen)
  const setAgentOpen = useUIStore((s) => s.setAgentOpen)

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

  const executeTool = useToolExecutor()
  const onToolCall = useCallback(
    (call: AgentToolCall): Promise<unknown> =>
      executeTool(call, activeVehicleId ?? ''),
    [executeTool, activeVehicleId],
  )

  return (
    <div className={styles.shell}>
      <Outlet />
      <InstallBanner />
      <AgentSheet
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        context={agentContext}
        onToolCall={onToolCall}
        isPro={isPro}
      />
    </div>
  )
}
