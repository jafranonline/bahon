import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/database'
import { addVehicle } from '../../src/db/queries/useVehicles'
import { addFuelLog, getLastOdometer } from '../../src/db/queries/useFuelLogs'

let vehicleId: string

beforeEach(async () => {
  await db.vehicles.clear()
  await db.fuelLogs.clear()
  vehicleId = await addVehicle({
    name: 'Fuel Test Car',
    brand: 'Toyota',
    model: 'Vios',
    year: 2022,
    type: 'car',
    fuelType: 'octane',
    odometer: 20000,
  })
})

describe('fuel logs integration', () => {
  it('monthly query returns only logs for the given month', async () => {
    await addFuelLog({ vehicleId, date: '2026-05-10', volumeLitres: 30, pricePerLitre: 130, totalCost: 3900, odometer: 20030 })
    await addFuelLog({ vehicleId, date: '2026-06-10', volumeLitres: 35, pricePerLitre: 130, totalCost: 4550, odometer: 20065 })
    await addFuelLog({ vehicleId, date: '2026-06-25', volumeLitres: 40, pricePerLitre: 130, totalCost: 5200, odometer: 20105 })

    const juneLogs = await db.fuelLogs
      .where('vehicleId').equals(vehicleId)
      .and(l => l.date >= '2026-06-01' && l.date <= '2026-06-30')
      .toArray()
    expect(juneLogs).toHaveLength(2)
  })

  it('getLastOdometer returns max odometer value across logs', async () => {
    await addFuelLog({ vehicleId, date: '2026-06-01', volumeLitres: 30, pricePerLitre: 130, totalCost: 3900, odometer: 20030 })
    await addFuelLog({ vehicleId, date: '2026-06-15', volumeLitres: 35, pricePerLitre: 130, totalCost: 4550, odometer: 20800 })
    await addFuelLog({ vehicleId, date: '2026-06-10', volumeLitres: 40, pricePerLitre: 130, totalCost: 5200, odometer: 20400 })

    const last = await getLastOdometer(vehicleId)
    expect(last).toBe(20800)
  })
})
