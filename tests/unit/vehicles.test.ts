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

describe('vehicles', () => {
  it('adds a vehicle and it appears in the DB', async () => {
    const id = await addVehicle({
      name: 'My Car',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2020,
      type: 'car',
      fuelType: 'octane',
      odometer: 10000,
    })
    const vehicle = await db.vehicles.get(id)
    expect(vehicle).toBeDefined()
    expect(vehicle?.name).toBe('My Car')
  })

  it('deletes a vehicle', async () => {
    const id = await addVehicle({
      name: 'Delete Me',
      brand: 'Honda',
      model: 'Civic',
      year: 2019,
      type: 'car',
      fuelType: 'petrol',
      odometer: 5000,
    })
    await deleteVehicle(id)
    const vehicle = await db.vehicles.get(id)
    expect(vehicle).toBeUndefined()
  })

  it('cascading delete removes associated fuel logs', async () => {
    const id = await addVehicle({
      name: 'Cascade Test',
      brand: 'Suzuki',
      model: 'Swift',
      year: 2021,
      type: 'car',
      fuelType: 'octane',
      odometer: 20000,
    })
    await addFuelLog({
      vehicleId: id,
      date: '2026-06-01',
      volumeLitres: 40,
      pricePerLitre: 130,
      totalCost: 5200,
      odometer: 20040,
    })
    const logsBefore = await db.fuelLogs.where('vehicleId').equals(id).toArray()
    expect(logsBefore).toHaveLength(1)

    await deleteVehicle(id)
    const logsAfter = await db.fuelLogs.where('vehicleId').equals(id).toArray()
    expect(logsAfter).toHaveLength(0)
  })
})
