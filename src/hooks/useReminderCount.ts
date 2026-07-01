import { useVehicleStore } from '@store/vehicleStore'
import { useVehicle } from '@db/queries/useVehicles'
import { useReminders } from '@db/queries/useReminders'
import type { Reminder } from '@/types'

type Urgency = 'overdue' | 'urgent' | 'future'

const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, urgent: 1, future: 2 }

function getUrgency(r: Reminder, currentOdo?: number): Urgency {
  const due = r.type === 'repeat' ? (r.nextDueDate ?? r.dueDate) : r.dueDate
  let dateUrgency: Urgency = 'future'
  if (due) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.floor((new Date(due).getTime() - today.getTime()) / 86400000)
    if (days < 0) dateUrgency = 'overdue'
    else if (days <= r.daysBeforeAlert) dateUrgency = 'urgent'
  }

  let odoUrgency: Urgency = 'future'
  const effectiveDueOdo = r.nextDueOdometer ?? r.dueOdometer
  if (effectiveDueOdo != null && currentOdo != null) {
    const remaining = effectiveDueOdo - currentOdo
    if (remaining <= 0) odoUrgency = 'overdue'
    else if (remaining <= (r.kmBeforeAlert ?? 1000)) odoUrgency = 'urgent'
  }

  return URGENCY_ORDER[dateUrgency] <= URGENCY_ORDER[odoUrgency] ? dateUrgency : odoUrgency
}

/**
 * Number of reminders for the active vehicle that are due soon (overdue or
 * urgent) — used for the BottomNav badge across screens.
 */
export function useReminderCount(): number {
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const vehicle = useVehicle(activeVehicleId ?? '')
  const reminders = useReminders(activeVehicleId ?? undefined)
  const currentOdo = vehicle?.odometer
  return reminders.filter((r) => getUrgency(r, currentOdo) !== 'future').length
}
