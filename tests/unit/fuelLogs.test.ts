import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/database'
import { addVehicle } from '../../src/db/queries/useVehicles'
import { addFuelLog, getLastOdometer } from '../../src/db/queries/useFuelLogs'

let vehicleId: string

beforeEach(async () => {
  await db.vehicles.clear()
  await db.fuelLogs.clear()
  vehicleId = await addVehicle({
    name: 'Test Car',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    type: 'car',
    fuelType: 'octane',
    odometer: 10000,
  })
})

describe('fuel logs', () => {
  it('monthly query returns only logs for the given month', async () => {
    await addFuelLog({ vehicleId, date: '2026-06-10', volumeLitres: 30, pricePerLitre: 130, totalCost: 3900, odometer: 10030 })
    await addFuelLog({ vehicleId, date: '2026-06-20', volumeLitres: 35, pricePerLitre: 130, totalCost: 4550, odometer: 10065 })
    await addFuelLog({ vehicleId, date: '2026-07-05', volumeLitres: 40, pricePerLitre: 130, totalCost: 5200, odometer: 10105 })

    const from = '2026-06-01'
    const to = '2026-06-31'
    const logs = await db.fuelLogs
      .where('vehicleId').equals(vehicleId)
      .and(l => l.date >= from && l.date <= to)
      .toArray()
    expect(logs).toHaveLength(2)
  })

  it('getLastOdometer returns the highest odometer value', async () => {
    await addFuelLog({ vehicleId, date: '2026-06-01', volumeLitres: 30, pricePerLitre: 130, totalCost: 3900, odometer: 10030 })
    await addFuelLog({ vehicleId, date: '2026-06-15', volumeLitres: 35, pricePerLitre: 130, totalCost: 4550, odometer: 10500 })
    await addFuelLog({ vehicleId, date: '2026-06-10', volumeLitres: 40, pricePerLitre: 130, totalCost: 5200, odometer: 10250 })

    const last = await getLastOdometer(vehicleId)
    expect(last).toBe(10500)
  })

  it('getLastOdometer returns 0 when no logs exist', async () => {
    const last = await getLastOdometer(vehicleId)
    expect(last).toBe(0)
  })
})
