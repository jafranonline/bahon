import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@db/database'
import { softDeleteTrack } from '@db/tombstones'
import type { FuelLog } from '@/types'

export function useFuelLogs(vehicleId: string) {
  return useLiveQuery(
    () => db.fuelLogs.where('vehicleId').equals(vehicleId).reverse().sortBy('date'),
    [vehicleId]
  ) ?? []
}

export function useFuelLogsByDateRange(vehicleId: string, from: string, to: string) {
  return useLiveQuery(
    () => db.fuelLogs
      .where('vehicleId').equals(vehicleId)
      .and(log => log.date >= from && log.date <= to)
      .reverse()
      .sortBy('date'),
    [vehicleId, from, to]
  ) ?? []
}

export function useMonthlyFuelLogs(vehicleId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = `${year}-${String(month).padStart(2, '0')}-31`
  return useLiveQuery(
    () => db.fuelLogs
      .where('vehicleId').equals(vehicleId)
      .and(log => log.date >= from && log.date <= to)
      .toArray(),
    [vehicleId, year, month]
  ) ?? []
}

export async function addFuelLog(
  data: Omit<FuelLog, 'id' | 'createdAt'>
): Promise<string> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.fuelLogs.add({ ...data, id, createdAt: now })
  return id
}

export async function updateFuelLog(
  id: string,
  data: Partial<Omit<FuelLog, 'id' | 'createdAt'>>
): Promise<void> {
  await db.fuelLogs.update(id, data)
}

export async function deleteFuelLog(id: string): Promise<void> {
  await db.fuelLogs.delete(id)
  await softDeleteTrack('fuelLogs', id)
}

export async function getLastOdometer(vehicleId: string): Promise<number> {
  const logs = await db.fuelLogs
    .where('vehicleId').equals(vehicleId)
    .toArray()
  if (logs.length === 0) return 0
  return Math.max(...logs.map(l => l.odometer))
}
