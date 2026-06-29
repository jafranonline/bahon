import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@db/database'
import type { ServiceLog } from '@/types'

export function useServiceLogs(vehicleId: string) {
  return useLiveQuery(
    () => db.serviceLogs.where('vehicleId').equals(vehicleId).reverse().sortBy('date'),
    [vehicleId]
  ) ?? []
}

export function useMonthlyServiceLogs(vehicleId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = `${year}-${String(month).padStart(2, '0')}-31`
  return useLiveQuery(
    () => db.serviceLogs
      .where('vehicleId').equals(vehicleId)
      .and(log => log.date >= from && log.date <= to)
      .toArray(),
    [vehicleId, year, month]
  ) ?? []
}

export async function addServiceLog(
  data: Omit<ServiceLog, 'id' | 'createdAt'>
): Promise<string> {
  const id = crypto.randomUUID()
  await db.serviceLogs.add({ ...data, id, createdAt: new Date().toISOString() })
  return id
}

export async function updateServiceLog(
  id: string,
  data: Partial<Omit<ServiceLog, 'id' | 'createdAt'>>
): Promise<void> {
  await db.serviceLogs.update(id, data)
}

export async function deleteServiceLog(id: string): Promise<void> {
  await db.serviceLogs.delete(id)
}
