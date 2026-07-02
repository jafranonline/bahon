import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db } from '@db/database'
import { softDeleteTrack } from '@db/tombstones'
import type { Expense } from '@/types'

export function useExpenses(vehicleId: string) {
  return useLiveQuery(
    () => db.expenses
      .where('[vehicleId+date]')
      .between([vehicleId, Dexie.minKey], [vehicleId, Dexie.maxKey])
      .reverse()
      .toArray(),
    [vehicleId]
  ) ?? []
}

export function useRecentExpenses(vehicleId: string, limit: number) {
  return useLiveQuery(
    () => db.expenses
      .where('[vehicleId+date]')
      .between([vehicleId, Dexie.minKey], [vehicleId, Dexie.maxKey])
      .reverse()
      .limit(limit)
      .toArray(),
    [vehicleId, limit]
  ) ?? []
}

export function useMonthlyExpenses(vehicleId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = `${year}-${String(month).padStart(2, '0')}-31`
  return useLiveQuery(
    () => db.expenses
      .where('[vehicleId+date]')
      .between([vehicleId, from], [vehicleId, to], true, true)
      .toArray(),
    [vehicleId, year, month]
  ) ?? []
}

export async function addExpense(
  data: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> {
  const id = crypto.randomUUID()
  await db.expenses.add({ ...data, id, createdAt: new Date().toISOString() })
  return id
}

export async function updateExpense(
  id: string,
  data: Partial<Omit<Expense, 'id' | 'createdAt'>>
): Promise<void> {
  await db.expenses.update(id, data)
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
  await softDeleteTrack('expenses', id)
}
