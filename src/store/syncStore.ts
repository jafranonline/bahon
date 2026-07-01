import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  error: string | null
  setSyncing: () => void
  setSynced: (at: string) => void
  setError: (error: string) => void
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      status: 'idle',
      lastSyncedAt: null,
      error: null,
      setSyncing: () => set({ status: 'syncing', error: null }),
      setSynced: (at) => set({ status: 'synced', lastSyncedAt: at, error: null }),
      setError: (error) => set({ status: 'error', error }),
    }),
    { name: 'bahon-sync', partialize: (s) => ({ lastSyncedAt: s.lastSyncedAt }) },
  ),
)
