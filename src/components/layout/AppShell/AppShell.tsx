import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSettingsStore } from '@store/settingsStore'
import { useVehicleStore } from '@store/vehicleStore'
import { useVehicle, useVehicles } from '@db/queries/useVehicles'
import { useTheme } from '@hooks/useTheme'
import { useNotifications } from '@hooks/useNotifications'
import type { AgentContext } from '@hooks/useAgent'
import { useAuthStore } from '@store/authStore'
import { useUIStore } from '@store/uiStore'
import { syncNow } from '@/sync/syncEngine'
import { InstallBanner } from '../InstallBanner/InstallBanner'
import { NavDrawer } from '../../domain/NavDrawer/NavDrawer'
import i18n from '@i18n/config'
import styles from './AppShell.module.css'

// The agent stack (sheet UI, useAgent, tool executor, VAD) is a sizeable chunk
// that most sessions never use — load it on first open of the AI sheet.
const AgentSheetHost = lazy(() =>
  import('../../domain/AgentSheet/AgentSheetHost').then((m) => ({ default: m.AgentSheetHost })),
)

export function AppShell() {
  useTheme()

  const language = useSettingsStore((s) => s.language)
  const currency = useSettingsStore((s) => s.currency)
  const distanceUnit = useSettingsStore((s) => s.distanceUnit)
  const volumeUnit = useSettingsStore((s) => s.volumeUnit)
  const fuelPrices = useSettingsStore((s) => s.fuelPrices)

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language)
    }
  }, [language])

  // Request once on mount — calling this during render fired a new
  // Notification.requestPermission() on every AppShell re-render.
  const { requestPermission } = useNotifications()
  useEffect(() => {
    void requestPermission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  // Mount the lazy sheet on first open and keep it mounted afterwards, so
  // close/reopen preserves in-flight agent state (mic, pending replies).
  const [agentMounted, setAgentMounted] = useState(false)
  useEffect(() => {
    if (agentOpen) setAgentMounted(true)
  }, [agentOpen])

  const agentContext = useMemo<AgentContext | null>(() => {
    if (!vehicle) return null
    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleType: vehicle.type,
      fuelType: vehicle.fuelType,
      currentOdometer: vehicle.odometer,
      fuelPrice: fuelPrices?.[vehicle.fuelType] ?? 0,
      today: new Date().toISOString().slice(0, 10),
      language,
      currency,
      distanceUnit,
      volumeUnit,
    }
  }, [vehicle, language, currency, distanceUnit, volumeUnit, fuelPrices])

  return (
    <div className={styles.shell}>
      <Outlet />
      <InstallBanner />
      <NavDrawer />
      {agentMounted && (
        <Suspense fallback={null}>
          <AgentSheetHost
            open={agentOpen}
            onClose={() => setAgentOpen(false)}
            context={agentContext}
            activeVehicleId={activeVehicleId ?? null}
          />
        </Suspense>
      )}
    </div>
  )
}
