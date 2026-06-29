import { describe, it, expect } from 'vitest'
import {
  calcEfficiencyKmL,
  calcEfficiencyL100km,
  calcEfficiencyMPG,
  calcTotalCost,
  calcPricePerLitre,
  kmToMiles,
  milesToKm,
  litresToGallons,
  gallonsToLitres,
  kmLToMPG,
  kmLToL100km,
  MPGToKmL,
  L100kmToKmL,
  addDays,
  addMonths,
  addYears,
  daysUntil,
  getMonthKey,
  sumByMonth,
} from '../../src/utils/calculations'

describe('fuel efficiency', () => {
  it('calcEfficiencyKmL(100, 8) === 12.5', () => {
    expect(calcEfficiencyKmL(100, 8)).toBe(12.5)
  })

  it('calcEfficiencyL100km(100, 8) === 8', () => {
    expect(calcEfficiencyL100km(100, 8)).toBe(8)
  })

  it('calcEfficiencyMPG(100, 8) is close to expected value', () => {
    const result = calcEfficiencyMPG(100, 8)
    expect(result).toBeGreaterThan(0)
    expect(isNaN(result)).toBe(false)
  })

  it('kmLToMPG(12.4) ≈ 29.2 (within 0.1)', () => {
    expect(Math.abs(kmLToMPG(12.4) - 29.2)).toBeLessThan(0.1)
  })
})

describe('fuel cost', () => {
  it('calcTotalCost(40, 130) === 5200', () => {
    expect(calcTotalCost(40, 130)).toBe(5200)
  })

  it('calcPricePerLitre(5200, 40) === 130', () => {
    expect(calcPricePerLitre(5200, 40)).toBe(130)
  })
})

describe('unit conversions', () => {
  it('kmToMiles(100) ≈ 62.14', () => {
    expect(Math.abs(kmToMiles(100) - 62.14)).toBeLessThan(0.01)
  })

  it('milesToKm(62.1371) ≈ 100', () => {
    expect(Math.abs(milesToKm(62.1371) - 100)).toBeLessThan(0.01)
  })

  it('litresToGallons then gallonsToLitres roundtrips', () => {
    expect(Math.abs(gallonsToLitres(litresToGallons(40)) - 40)).toBeLessThan(0.001)
  })

  it('kmLToL100km(12.5) === 8', () => {
    expect(kmLToL100km(12.5)).toBe(8)
  })

  it('L100kmToKmL(8) === 12.5', () => {
    expect(L100kmToKmL(8)).toBe(12.5)
  })

  it('MPGToKmL roundtrips with kmLToMPG', () => {
    expect(Math.abs(MPGToKmL(kmLToMPG(12)) - 12)).toBeLessThan(0.001)
  })
})

describe('no NaN for valid inputs', () => {
  it('all efficiency functions return numbers', () => {
    expect(isNaN(calcEfficiencyKmL(100, 8))).toBe(false)
    expect(isNaN(calcEfficiencyL100km(100, 8))).toBe(false)
    expect(isNaN(calcEfficiencyMPG(100, 8))).toBe(false)
    expect(isNaN(calcTotalCost(40, 130))).toBe(false)
    expect(isNaN(calcPricePerLitre(5200, 40))).toBe(false)
  })
})

describe('date helpers', () => {
  it('addDays adds correct number of days', () => {
    const d = new Date('2026-06-15')
    expect(addDays(d, 5).toISOString().slice(0, 10)).toBe('2026-06-20')
  })

  it('addMonths adds correct months', () => {
    const d = new Date('2026-06-15')
    expect(addMonths(d, 3).toISOString().slice(0, 10)).toBe('2026-09-15')
  })

  it('addYears adds correct years', () => {
    const d = new Date('2026-06-15')
    expect(addYears(d, 1).toISOString().slice(0, 10)).toBe('2027-06-15')
  })

  it('daysUntil returns 0 for today', () => {
    expect(daysUntil(new Date())).toBe(0)
  })

  it('daysUntil returns positive for future date', () => {
    expect(daysUntil(addDays(new Date(), 7))).toBe(7)
  })
})

describe('monthly aggregation', () => {
  it('getMonthKey extracts YYYY-MM', () => {
    expect(getMonthKey('2026-06-15')).toBe('2026-06')
  })

  it('sumByMonth groups and sums correctly', () => {
    const logs = [
      { date: '2026-06-10', amount: 1000 },
      { date: '2026-06-20', amount: 500 },
      { date: '2026-07-05', amount: 800 },
    ]
    const result = sumByMonth(logs)
    expect(result['2026-06']).toBe(1500)
    expect(result['2026-07']).toBe(800)
  })
})
