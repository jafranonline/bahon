import { db } from '@db/database'
import type {
  Vehicle,
  FuelLog,
  ServiceLog,
  Expense,
  Reminder,
  VehicleDocument,
  Tombstone,
} from '@/types'

/** The full device dataset exchanged during sync (opaque to the backend). */
export interface Snapshot {
  version: string
  vehicles: Vehicle[]
  fuelLogs: FuelLog[]
  serviceLogs: ServiceLog[]
  expenses: Expense[]
  reminders: Reminder[]
  documents: VehicleDocument[]
  tombstones: Tombstone[]
}

export const EMPTY_SNAPSHOT: Snapshot = {
  version: '1',
  vehicles: [],
  fuelLogs: [],
  serviceLogs: [],
  expenses: [],
  reminders: [],
  documents: [],
  tombstones: [],
}

/** Reads the current local dataset into a snapshot. */
export async function buildSnapshot(): Promise<Snapshot> {
  return {
    version: '1',
    vehicles: await db.vehicles.toArray(),
    fuelLogs: await db.fuelLogs.toArray(),
    serviceLogs: await db.serviceLogs.toArray(),
    expenses: await db.expenses.toArray(),
    reminders: await db.reminders.toArray(),
    documents: await db.documents.toArray(),
    tombstones: await db.tombstones.toArray(),
  }
}

/** Replaces the local dataset with the given snapshot (used after a merge). */
export async function applySnapshot(s: Snapshot): Promise<void> {
  await db.transaction(
    'rw',
    [db.vehicles, db.fuelLogs, db.serviceLogs, db.expenses, db.reminders, db.documents, db.tombstones],
    async () => {
      await Promise.all([
        db.vehicles.clear(),
        db.fuelLogs.clear(),
        db.serviceLogs.clear(),
        db.expenses.clear(),
        db.reminders.clear(),
        db.documents.clear(),
        db.tombstones.clear(),
      ])
      await db.vehicles.bulkPut(s.vehicles)
      await db.fuelLogs.bulkPut(s.fuelLogs)
      await db.serviceLogs.bulkPut(s.serviceLogs)
      await db.expenses.bulkPut(s.expenses)
      await db.reminders.bulkPut(s.reminders)
      await db.documents.bulkPut(s.documents)
      await db.tombstones.bulkPut(s.tombstones)
    },
  )
}
