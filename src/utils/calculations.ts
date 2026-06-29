// Fuel efficiency
export function calcEfficiencyKmL(distanceKm: number, volumeL: number): number {
  return distanceKm / volumeL
}

export function calcEfficiencyL100km(distanceKm: number, volumeL: number): number {
  return (volumeL / distanceKm) * 100
}

export function calcEfficiencyMPG(distanceKm: number, volumeL: number): number {
  return (distanceKm * 0.621371) / (volumeL * 0.264172)
}

// Fuel cost
export function calcTotalCost(volumeL: number, pricePerL: number): number {
  return volumeL * pricePerL
}

export function calcPricePerLitre(totalCost: number, volumeL: number): number {
  return totalCost / volumeL
}

// Unit conversions
export function kmToMiles(km: number): number {
  return km * 0.621371
}

export function milesToKm(miles: number): number {
  return miles / 0.621371
}

export function litresToGallons(litres: number): number {
  return litres * 0.264172
}

export function gallonsToLitres(gallons: number): number {
  return gallons / 0.264172
}

export function kmLToMPG(kml: number): number {
  return kml * 2.35215
}

export function kmLToL100km(kml: number): number {
  return 100 / kml
}

export function MPGToKmL(mpg: number): number {
  return mpg / 2.35215
}

export function L100kmToKmL(l100: number): number {
  return 100 / l100
}

// Date helpers
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

export function daysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Monthly aggregation
export function getMonthKey(date: string): string {
  return date.slice(0, 7) // 'YYYY-MM'
}

export function sumByMonth(logs: Array<{ date: string; amount: number }>): Record<string, number> {
  return logs.reduce<Record<string, number>>((acc, log) => {
    const key = getMonthKey(log.date)
    acc[key] = (acc[key] ?? 0) + log.amount
    return acc
  }, {})
}
