import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/database'
import { addVehicle } from '../../src/db/queries/useVehicles'
import { addReminder, dismissReminder, advanceRepeatReminder } from '../../src/db/queries/useReminders'

let vehicleId: string

beforeEach(async () => {
  await db.vehicles.clear()
  await db.reminders.clear()
  vehicleId = await addVehicle({
    name: 'Test Car',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    type: 'car',
    fuelType: 'octane',
    odometer: 40000,
  })
})

describe('reminders', () => {
  it('dismissing a repeat monthly reminder advances nextDueDate by 1 month', async () => {
    const id = await addReminder({
      vehicleId,
      title: 'Oil Change',
      type: 'repeat',
      triggerType: 'date',
      repeatUnit: 'monthly',
      repeatValue: 1,
      nextDueDate: '2026-06-15',
      daysBeforeAlert: 3,
      kmBeforeAlert: 500,
      isActive: true,
    })

    await dismissReminder(id, 0)

    const updated = await db.reminders.get(id)
    expect(updated?.nextDueDate).toBe('2026-07-15')
    expect(updated?.isActive).toBe(true)
  })

  it('advanceRepeatReminder with km type sets nextDueOdometer = current + repeatValue', () => {
    const reminder: Parameters<typeof advanceRepeatReminder>[0] = {
      id: 'test',
      vehicleId,
      title: 'Chain Lube',
      type: 'repeat',
      triggerType: 'odometer',
      repeatUnit: 'km',
      repeatValue: 5000,
      nextDueOdometer: 45000,
      daysBeforeAlert: 3,
      kmBeforeAlert: 500,
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    const advanced = advanceRepeatReminder(reminder, 45000)
    expect(advanced.nextDueOdometer).toBe(50000)
  })

  it('useOverdueReminders returns reminder with past dueDate', async () => {
    await addReminder({
      vehicleId,
      title: 'Tax Token',
      type: 'one-time',
      triggerType: 'date',
      dueDate: '2025-01-01',
      daysBeforeAlert: 3,
      kmBeforeAlert: 500,
      isActive: true,
    })

    const today = new Date().toISOString().slice(0, 10)
    const overdue = await db.reminders
      .filter(r => r.isActive && !!(r.dueDate && r.dueDate < today))
      .toArray()
    expect(overdue).toHaveLength(1)
    expect(overdue[0].title).toBe('Tax Token')
  })
})
