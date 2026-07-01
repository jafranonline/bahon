import { apiFetch } from '@api/client'
import { useAuthStore } from '@store/authStore'
import { useSyncStore } from '@store/syncStore'
import { buildSnapshot, applySnapshot, EMPTY_SNAPSHOT, type Snapshot } from './snapshot'
import { mergeSnapshots } from './merge'

const MAX_ATTEMPTS = 3
let inFlight = false

/** Pull → merge → apply → push, retrying on version conflict. No-op unless
 * the user is a logged-in Pro. */
export async function syncNow(): Promise<void> {
  const auth = useAuthStore.getState()
  if (auth.status !== 'authenticated' || !auth.entitlements?.pro) return
  if (inFlight) return
  inFlight = true

  const sync = useSyncStore.getState()
  sync.setSyncing()
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const pull = await apiFetch('/api/sync', { method: 'GET' })
      if (pull.status === 403) {
        useSyncStore.getState().setError('pro_required')
        return
      }
      if (!pull.ok) throw new Error(`pull_${pull.status}`)
      const { version, snapshot } = (await pull.json()) as {
        version: number
        snapshot: Snapshot | null
      }

      const local = await buildSnapshot()
      const merged = mergeSnapshots(local, snapshot ?? EMPTY_SNAPSHOT)
      await applySnapshot(merged)

      const push = await apiFetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseVersion: version, snapshot: merged }),
      })
      if (push.status === 409) continue // someone pushed meanwhile — re-pull & retry
      if (!push.ok) throw new Error(`push_${push.status}`)

      useSyncStore.getState().setSynced(new Date().toISOString())
      return
    }
    throw new Error('conflict')
  } catch (err) {
    useSyncStore.getState().setError(err instanceof Error ? err.message : 'error')
  } finally {
    inFlight = false
  }
}
