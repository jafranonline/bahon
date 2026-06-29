import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/database'
import { addVehicle, deleteVehicle } from '../../src/db/queries/useVehicles'
import { addFuelLog } from '../../src/db/queries/useFuelLogs'

beforeEach(async () => {
  await db.vehicles.clear()
  await db.fuelLogs.clear()
  await db.serviceLogs.clear()
  await db.expenses.clear()
  await db.reminders.clear()
})

describe('vehicles integration', () => {
  it('adds a vehicle and retrieves it from DB', async () => {
    const id = await addVehicle({
      name: 'Integration Car',
      brand: 'Honda',
      model: 'Civic',
      year: 2023,
      type: 'car',
      fuelType: 'octane',
      odometer: 15000,
    })
    const vehicle = await db.vehicles.get(id)
    expect(vehicle).toBeDefined()
    expect(vehicle?.name).toBe('Integration Car')
    expect(vehicle?.odometer).toBe(15000)
  })

  it('deletes a vehicle and associated fuel logs are removed', async () => {
    const id = await addVehicle({
      name: 'Cascade Car',
      brand: 'Suzuki',
      model: 'Alto',
      year: 2021,
      type: 'car',
      fuelType: 'petrol',
      odometer: 30000,
    })
    await addFuelLog({ vehicleId: id, date: '2026-06-01', volumeLitres: 30, pricePerLitre: 120, totalCost: 3600, odometer: 30030 })
    await addFuelLog({ vehicleId: id, date: '2026-06-15', volumeLitres: 25, pricePerLitre: 120, totalCost: 3000, odometer: 30055 })

    const before = await db.fuelLogs.where('vehicleId').equals(id).toArray()
    expect(before).toHaveLength(2)

    await deleteVehicle(id)

    const vehicle = await db.vehicles.get(id)
    expect(vehicle).toBeUndefined()

    const after = await db.fuelLogs.where('vehicleId').equals(id).toArray()
    expect(after).toHaveLength(0)
  })
})
