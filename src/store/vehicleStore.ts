import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VehicleStore {
  activeVehicleId: string | null
  setActiveVehicle: (id: string | null) => void
}

export const useVehicleStore = create<VehicleStore>()(
  persist(
    (set) => ({
      activeVehicleId: null,
      setActiveVehicle: (id) => set({ activeVehicleId: id }),
    }),
    { name: 'bahon-active-vehicle' }
  )
)
