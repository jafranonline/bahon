import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@db/database'
import type { Reminder } from '@/types'

export function useReminders(vehicleId?: string) {
  return useLiveQuery(
    () => vehicleId
      ? db.reminders.where('vehicleId').equals(vehicleId).and(r => r.isActive).toArray()
      : db.reminders.filter(r => r.isActive).toArray(),
    [vehicleId]
  ) ?? []
}

export function useOverdueReminders() {
  const today = new Date().toISOString().slice(0, 10)
  return useLiveQuery(
    () => db.reminders
      .filter(r => r.isActive && !!(r.dueDate && r.dueDate < today))
      .toArray(),
    []
  ) ?? []
}

export async function addReminder(
  data: Omit<Reminder, 'id' | 'createdAt'>
): Promise<string> {
  const id = crypto.randomUUID()
  await db.reminders.add({ ...data, id, createdAt: new Date().toISOString() })
  return id
}

export async function updateReminder(
  id: string,
  data: Partial<Omit<Reminder, 'id' | 'createdAt'>>
): Promise<void> {
  await db.reminders.update(id, data)
}

export async function deleteReminder(id: string): Promise<void> {
  await db.reminders.delete(id)
}

export function advanceRepeatReminder(reminder: Reminder, currentOdometer: number): Reminder {
  const updated = { ...reminder }

  if (reminder.repeatUnit === 'km' && reminder.repeatValue) {
    updated.nextDueOdometer = currentOdometer + reminder.repeatValue
  } else if (reminder.nextDueDate && reminder.repeatUnit && reminder.repeatValue) {
    const d = new Date(reminder.nextDueDate)
    switch (reminder.repeatUnit) {
      case 'daily':
        d.setDate(d.getDate() + reminder.repeatValue)
        break
      case 'weekly':
        d.setDate(d.getDate() + reminder.repeatValue * 7)
        break
      case 'monthly':
        d.setMonth(d.getMonth() + reminder.repeatValue)
        break
      case 'yearly':
        d.setFullYear(d.getFullYear() + reminder.repeatValue)
        break
    }
    updated.nextDueDate = d.toISOString().slice(0, 10)
  }

  updated.lastTriggeredAt = new Date().toISOString()
  return updated
}

export async function dismissReminder(id: string, currentOdometer = 0): Promise<void> {
  const reminder = await db.reminders.get(id)
  if (!reminder) return

  if (reminder.type === 'one-time') {
    await db.reminders.update(id, { isActive: false, lastTriggeredAt: new Date().toISOString() })
  } else {
    const advanced = advanceRepeatReminder(reminder, currentOdometer)
    await db.reminders.update(id, {
      nextDueDate: advanced.nextDueDate,
      nextDueOdometer: advanced.nextDueOdometer,
      lastTriggeredAt: advanced.lastTriggeredAt,
    })
  }
}
