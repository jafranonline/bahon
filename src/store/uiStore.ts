import { create } from 'zustand'

interface UIStore {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
  statsTab: 'summary' | 'fuel' | 'service'
  setStatsTab: (tab: 'summary' | 'fuel' | 'service') => void
}

export const useUIStore = create<UIStore>()((set) => ({
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  statsTab: 'summary',
  setStatsTab: (tab) => set({ statsTab: tab }),
}))
