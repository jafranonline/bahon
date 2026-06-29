import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  getCurrencySymbol,
  formatDistance,
  formatVolume,
  formatEfficiency,
  formatDate,
  formatRelativeDate,
  formatNumber,
} from '../../src/utils/formatters'

describe('currency', () => {
  it('formatCurrency(5200, BDT) === "৳ 5,200"', () => {
    expect(formatCurrency(5200, 'BDT')).toBe('৳ 5,200')
  })

  it('formatCurrency(5200.5, USD) includes decimal', () => {
    expect(formatCurrency(5200.5, 'USD')).toBe('$ 5,200.50')
  })

  it('formatCurrency compact mode uses K suffix', () => {
    expect(formatCurrency(5200, 'BDT', true)).toBe('৳ 5.2K')
  })

  it('getCurrencySymbol returns correct symbols', () => {
    expect(getCurrencySymbol('BDT')).toBe('৳')
    expect(getCurrencySymbol('EUR')).toBe('€')
    expect(getCurrencySymbol('GBP')).toBe('£')
  })

  it('no NaN in output', () => {
    expect(formatCurrency(0, 'BDT')).not.toContain('NaN')
    expect(formatCurrency(1000000, 'USD')).not.toContain('NaN')
  })
})

describe('distance', () => {
  it('formatDistance(100, mi) === "62.1 mi"', () => {
    expect(formatDistance(100, 'mi')).toBe('62.1 mi')
  })

  it('formatDistance(100, km) shows km', () => {
    expect(formatDistance(100, 'km')).toBe('100 km')
  })
})

describe('volume', () => {
  it('formatVolume(40, L) === "40.0 L"', () => {
    expect(formatVolume(40, 'L')).toBe('40.0 L')
  })

  it('formatVolume(40, gal) converts to gallons', () => {
    const result = formatVolume(40, 'gal')
    expect(result).toContain('gal')
    expect(result).not.toContain('NaN')
  })
})

describe('efficiency', () => {
  it('formatEfficiency(12.4, L/100km) === "8.1 L/100km"', () => {
    expect(formatEfficiency(12.4, 'L/100km')).toBe('8.1 L/100km')
  })

  it('formatEfficiency(12.5, km/L) === "12.5 km/L"', () => {
    expect(formatEfficiency(12.5, 'km/L')).toBe('12.5 km/L')
  })

  it('formatEfficiency MPG does not NaN', () => {
    expect(formatEfficiency(12, 'MPG')).not.toContain('NaN')
  })
})

describe('date', () => {
  it('formatDate returns English date', () => {
    expect(formatDate('2026-06-28', 'en')).toBe('28 Jun 2026')
  })

  it('formatDate returns Bangla month', () => {
    const result = formatDate('2026-06-28', 'bn')
    expect(result).toContain('জুন')
  })

  it('formatRelativeDate returns Today for today', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(formatRelativeDate(today)).toBe('Today')
  })
})

describe('number', () => {
  it('formatNumber formats with no decimals by default', () => {
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('formatNumber respects decimals param', () => {
    expect(formatNumber(12.456, 2)).toBe('12.46')
  })
})
