import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/database'
import { addVehicle } from '../../src/db/queries/useVehicles'
import { addReminder, dismissReminder } from '../../src/db/queries/useReminders'

let vehicleId: string

beforeEach(async () => {
  await db.vehicles.clear()
  await db.reminders.clear()
  vehicleId = await addVehicle({
    name: 'Reminder Car',
    brand: 'Bajaj',
    model: 'Pulsar',
    year: 2023,
    type: 'motorcycle',
    fuelType: 'octane',
    odometer: 42000,
  })
})

describe('reminders integration', () => {
  it('dismissing a monthly repeat reminder advances nextDueDate by 1 month', async () => {
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

  it('dismissing a km-based repeat reminder advances nextDueOdometer by repeatValue', async () => {
    const id = await addReminder({
      vehicleId,
      title: 'Chain Lube',
      type: 'repeat',
      triggerType: 'odometer',
      repeatUnit: 'km',
      repeatValue: 5000,
      nextDueOdometer: 47000,
      daysBeforeAlert: 3,
      kmBeforeAlert: 500,
      isActive: true,
    })

    await dismissReminder(id, 42000)

    const updated = await db.reminders.get(id)
    expect(updated?.nextDueOdometer).toBe(47000)
  })
})
