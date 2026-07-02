import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db } from '@db/database'
import { softDeleteTrack } from '@db/tombstones'
import type { ServiceLog } from '@/types'

export function useServiceLogs(vehicleId: string) {
  return useLiveQuery(
    () => db.serviceLogs
      .where('[vehicleId+date]')
      .between([vehicleId, Dexie.minKey], [vehicleId, Dexie.maxKey])
      .reverse()
      .toArray(),
    [vehicleId]
  ) ?? []
}

export function useRecentServiceLogs(vehicleId: string, limit: number) {
  return useLiveQuery(
    () => db.serviceLogs
      .where('[vehicleId+date]')
      .between([vehicleId, Dexie.minKey], [vehicleId, Dexie.maxKey])
      .reverse()
      .limit(limit)
      .toArray(),
    [vehicleId, limit]
  ) ?? []
}

export function useMonthlyServiceLogs(vehicleId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = `${year}-${String(month).padStart(2, '0')}-31`
  return useLiveQuery(
    () => db.serviceLogs
      .where('[vehicleId+date]')
      .between([vehicleId, from], [vehicleId, to], true, true)
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
  await softDeleteTrack('serviceLogs', id)
}
