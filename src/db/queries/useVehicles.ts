import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@db/database'
import type { Vehicle } from '@/types'

export function useVehicles() {
  return useLiveQuery(() =>
    db.vehicles.orderBy('createdAt').reverse().toArray()
  ) ?? []
}

export function useVehicle(id: string) {
  return useLiveQuery(() => db.vehicles.get(id), [id])
}

export async function addVehicle(
  data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.vehicles.add({ ...data, id, createdAt: now, updatedAt: now })
  return id
}

export async function updateVehicle(
  id: string,
  data: Partial<Omit<Vehicle, 'id' | 'createdAt'>>
): Promise<void> {
  await db.vehicles.update(id, { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteVehicle(id: string): Promise<void> {
  await db.transaction('rw', [db.vehicles, db.fuelLogs, db.serviceLogs, db.expenses, db.reminders], async () => {
    await db.vehicles.delete(id)
    await db.fuelLogs.where('vehicleId').equals(id).delete()
    await db.serviceLogs.where('vehicleId').equals(id).delete()
    await db.expenses.where('vehicleId').equals(id).delete()
    await db.reminders.where('vehicleId').equals(id).delete()
  })
}
