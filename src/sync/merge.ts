import type { Tombstone } from '@/types'
import type { Snapshot } from './snapshot'

interface Record {
  id: string
  createdAt?: string
  updatedAt?: string
}

/** Effective timestamp for last-write-wins: prefer updatedAt, fall back to createdAt. */
function ts(r: { createdAt?: string; updatedAt?: string }): string {
  return r.updatedAt ?? r.createdAt ?? ''
}

/** Union two record lists by id (newer wins), then drop any record whose
 * tombstone was recorded after the record's last change. */
function mergeEntity<T extends Record>(
  local: T[],
  remote: T[],
  tombById: Map<string, string>,
): T[] {
  const byId = new Map<string, T>()
  for (const r of [...local, ...remote]) {
    const existing = byId.get(r.id)
    if (!existing || ts(r) >= ts(existing)) byId.set(r.id, r)
  }
  const out: T[] = []
  for (const r of byId.values()) {
    const deletedAt = tombById.get(r.id)
    if (deletedAt && deletedAt > ts(r)) continue // deleted after last update
    out.push(r)
  }
  return out
}

/** Union tombstones by id, keeping the newest deletion time. */
function mergeTombstones(local: Tombstone[], remote: Tombstone[]): Tombstone[] {
  const byId = new Map<string, Tombstone>()
  for (const t of [...local, ...remote]) {
    const existing = byId.get(t.id)
    if (!existing || t.deletedAt > existing.deletedAt) byId.set(t.id, t)
  }
  return [...byId.values()]
}

/** Pure last-write-wins merge of two snapshots with tombstone-based deletes. */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  const tombstones = mergeTombstones(local.tombstones ?? [], remote.tombstones ?? [])
  const tombById = new Map(tombstones.map((t) => [t.id, t.deletedAt]))
  return {
    version: '1',
    vehicles: mergeEntity(local.vehicles, remote.vehicles, tombById),
    fuelLogs: mergeEntity(local.fuelLogs, remote.fuelLogs, tombById),
    serviceLogs: mergeEntity(local.serviceLogs, remote.serviceLogs, tombById),
    expenses: mergeEntity(local.expenses, remote.expenses, tombById),
    reminders: mergeEntity(local.reminders, remote.reminders, tombById),
    documents: mergeEntity(local.documents, remote.documents, tombById),
    tombstones,
  }
}
