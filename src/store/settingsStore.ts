import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '@/types'

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

const defaults: Settings = {
  language: 'en',
  theme: 'system',
  currency: 'BDT',
  distanceUnit: 'km',
  volumeUnit: 'L',
  efficiencyUnit: 'km/L',
  notificationsEnabled: false,
  fuelPrices: {
    octane: 145,
    petrol: 140,
    diesel: 115,
    cng: 27,
    hybrid: 140,
  },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaults,
      update: (patch) => set((state) => ({ ...state, ...patch })),
      reset: () => set(defaults),
    }),
    { name: 'bahon-settings' }
  )
)
