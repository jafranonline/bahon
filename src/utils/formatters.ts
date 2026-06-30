import type { Currency, DistanceUnit, VolumeUnit, EfficiencyUnit } from '@/types'
import { kmToMiles, litresToGallons, kmLToL100km, kmLToMPG } from './calculations'

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BDT: '৳',
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  SAR: '﷼',
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency]
}

export function formatCurrency(
  amount: number,
  currency: Currency,
  compact = false
): string {
  const symbol = getCurrencySymbol(currency)
  if (compact && amount >= 1000) {
    const k = amount / 1000
    return `${symbol} ${k.toFixed(1)}K`
  }
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDistance(km: number, unit: DistanceUnit): string {
  if (unit === 'mi') {
    return `${kmToMiles(km).toFixed(1)} mi`
  }
  return `${Math.round(km).toLocaleString('en-US')} km`
}

export function formatVolume(litres: number, unit: VolumeUnit): string {
  if (unit === 'gal') {
    return `${litresToGallons(litres).toFixed(1)} gal`
  }
  return `${litres.toFixed(1)} L`
}

export function formatEfficiency(kmPerL: number, unit: EfficiencyUnit): string {
  switch (unit) {
    case 'L/100km':
      return `${kmLToL100km(kmPerL).toFixed(1)} L/100km`
    case 'MPG':
      return `${kmLToMPG(kmPerL).toFixed(1)} MPG`
    default:
      return `${kmPerL.toFixed(1)} km/L`
  }
}

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']

export function formatDate(isoDate: string, locale: 'en' | 'bn' = 'en'): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const months = locale === 'bn' ? MONTH_NAMES_BN : MONTH_NAMES_EN
  return `${day} ${months[month - 1]} ${year}`
}

export function formatRelativeDate(isoDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(isoDate)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  return `In ${diff} days`
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
