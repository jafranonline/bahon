import { db } from './database'
import type { Tombstone } from '@/types'

/** Records a deletion so it propagates to other devices on the next sync. */
export async function softDeleteTrack(entity: Tombstone['entity'], id: string): Promise<void> {
  await db.tombstones.put({ id, entity, deletedAt: new Date().toISOString() })
}

export async function softDeleteTrackMany(
  entity: Tombstone['entity'],
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return
  const deletedAt = new Date().toISOString()
  await db.tombstones.bulkPut(ids.map((id) => ({ id, entity, deletedAt })))
}
