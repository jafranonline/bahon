import { useCallback } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { db } from '@db/database'
import { addFuelLog, deleteFuelLog, getLastOdometer } from '@db/queries/useFuelLogs'
import { addServiceLog, deleteServiceLog } from '@db/queries/useServiceLogs'
import { addExpense, deleteExpense } from '@db/queries/useExpenses'
import { addReminder, deleteReminder } from '@db/queries/useReminders'
import { addDocument } from '@db/queries/useDocuments'
import { updateVehicle, deleteVehicle } from '@db/queries/useVehicles'
import { softDeleteTrackMany } from '@db/tombstones'
import { useSettingsStore } from '@store/settingsStore'
import { useVehicleStore } from '@store/vehicleStore'
import type { FuelType } from '@/types'
import {
  calcEfficiencyKmL,
  calcEfficiencyL100km,
  calcEfficiencyMPG,
} from '@utils/calculations'
import type { AgentToolCall } from './useAgent'
import type { FuelLog, Reminder } from '@/types'

const SERVICE_CATEGORIES = [
  'oil_change', 'oil_filter', 'air_filter', 'fuel_filter', 'spark_plug',
  'brake_pad', 'brake_disc', 'tire_rotation', 'tire_replacement',
  'wheel_alignment', 'wheel_balancing', 'battery', 'coolant', 'transmission',
  'ac_service', 'chain_service', 'wash', 'inspection', 'registration', 'other',
]
const EXPENSE_CATEGORIES = [
  'tax_token', 'insurance', 'parking', 'toll', 'fuel_tax', 'fine', 'wash',
  'accessories', 'other',
]
const DOCUMENT_TYPES = ['fitness', 'insurance', 'registration', 'tax_token', 'other']

const SCREEN_ROUTES: Record<string, string> = {
  home: '/',
  stats: '/stats',
  logs: '/stats',
  reminders: '/reminders',
  settings: '/settings',
  vehicles: '/',
}

const today = () => new Date().toISOString().slice(0, 10)

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.-]/g, ''))
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t && !/^(null|undefined|none|n\/a)$/i.test(t) ? t : undefined
}

function mapEnum(v: unknown, allowed: string[], fallback: string): string {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return allowed.includes(s) ? s : fallback
}

/** Executes one agent tool call against Dexie / settings / navigation.
 * Returns a short result string that is fed back to the model: "ok" for
 * successful writes, serialized JSON for reads, or an "Error: …" string. */
export async function executeToolCall(
  call: AgentToolCall,
  vehicleId: string,
  navigate: NavigateFunction,
): Promise<string> {
  const p = call.input
  // Mutating tools need a real target vehicle. A write with an empty id would
  // silently persist a row no screen can show (every view is vehicle-scoped),
  // producing the "saved but not on the dashboard" symptom.
  const MUTATING = [
    'add_fuel_log', 'add_service_log', 'add_expense', 'add_reminder', 'add_document',
    'update_vehicle', 'delete_recent_log', 'delete_vehicle', 'clear_all_data',
  ]
  if (MUTATING.includes(call.name) && !vehicleId) {
    return 'Error: no active vehicle is selected, so nothing was saved.'
  }
  try {
    switch (call.name) {
      case 'add_fuel_log': {
        // Users often give only a taka total ("300 taka of fuel"). Resolve
        // litres + price from whatever two of {litres, price, total} we have,
        // falling back to the saved fuel price for this vehicle's fuel type.
        const vehicleForFuel = await db.vehicles.get(vehicleId)
        const lockedPrice = vehicleForFuel
          ? num(useSettingsStore.getState().fuelPrices?.[vehicleForFuel.fuelType as FuelType])
          : undefined
        const resolved = resolveFuel(
          num(p.volumeLitres),
          num(p.pricePerLitre),
          num(p.totalCost),
          lockedPrice,
        )
        // "ask:" marks a needs-info question — useAgent shows it to the user
        // directly instead of round-tripping it through the model (which would
        // read it as a completed action and wrongly confirm success).
        if ('ask' in resolved) return `ask:${resolved.ask}`
        const { volumeLitres, pricePerLitre, totalCost } = resolved
        // Learn the price: when the user actually stated it (explicit price, or
        // derivable from litres+total), save it as this fuel type's price so
        // future bare "N taka" logs resolve without asking again.
        const statedPrice =
          num(p.pricePerLitre) ??
          (num(p.volumeLitres) !== undefined && num(p.totalCost) !== undefined
            ? pricePerLitre
            : undefined)
        if (vehicleForFuel && statedPrice && statedPrice > 0 && statedPrice !== lockedPrice) {
          const prices = useSettingsStore.getState().fuelPrices ?? {}
          useSettingsStore.getState().update({
            fuelPrices: { ...prices, [vehicleForFuel.fuelType as FuelType]: round(statedPrice, 2) },
          })
        }
        const prevOdo = await getLastOdometer(vehicleId)
        let odometer = num(p.odometer)
        if (odometer === undefined || odometer <= 0) {
          const v = await db.vehicles.get(vehicleId)
          odometer = v && v.odometer > 0 ? v.odometer : prevOdo
        }
        const distance = prevOdo > 0 ? odometer - prevOdo : 0
        const hasDistance = distance > 0
        const entry: Omit<FuelLog, 'id' | 'createdAt'> = {
          vehicleId,
          date: str(p.date) ?? today(),
          volumeLitres,
          pricePerLitre,
          totalCost,
          odometer,
          previousOdometer: prevOdo > 0 ? prevOdo : undefined,
          efficiencyKmPerL: hasDistance ? calcEfficiencyKmL(distance, volumeLitres) : undefined,
          efficiencyL100km: hasDistance ? calcEfficiencyL100km(distance, volumeLitres) : undefined,
          efficiencyMPG: hasDistance ? calcEfficiencyMPG(distance, volumeLitres) : undefined,
          stationName: str(p.stationName),
          notes: str(p.notes),
        }
        await addFuelLog(entry)
        await bumpOdometer(vehicleId, odometer)
        return 'ok'
      }

      case 'add_service_log': {
        const cost = num(p.cost) ?? 0
        const category = mapEnum(p.category, SERVICE_CATEGORIES, 'other')
        await addServiceLog({
          vehicleId,
          date: str(p.date) ?? today(),
          category: category as never,
          title: str(p.title) ?? category.replace(/_/g, ' '),
          cost,
          odometer: num(p.odometer),
          shopName: str(p.shopName),
          notes: str(p.notes),
        })
        if (num(p.odometer) !== undefined) await bumpOdometer(vehicleId, num(p.odometer)!)
        return 'ok'
      }

      case 'add_expense': {
        const amount = num(p.amount) ?? 0
        const category = mapEnum(p.category, EXPENSE_CATEGORIES, 'other')
        await addExpense({
          vehicleId,
          date: str(p.date) ?? today(),
          category: category as never,
          title: str(p.title) ?? category.replace(/_/g, ' '),
          amount,
          notes: str(p.notes),
        })
        return 'ok'
      }

      case 'add_reminder': {
        const title = str(p.title)
        if (!title) return 'Error: reminder needs a title.'
        const type = p.type === 'repeat' ? 'repeat' : 'one-time'
        const triggerType =
          p.triggerType === 'odometer' || p.triggerType === 'both'
            ? p.triggerType
            : 'date'
        const dueDate = str(p.dueDate)
        const dueOdometer = num(p.dueOdometer)
        const entry: Omit<Reminder, 'id' | 'createdAt'> = {
          vehicleId,
          title,
          type,
          triggerType,
          dueDate,
          dueOdometer,
          repeatUnit: type === 'repeat' ? (p.repeatUnit as Reminder['repeatUnit']) : undefined,
          repeatValue: type === 'repeat' ? num(p.repeatValue) : undefined,
          nextDueDate: dueDate,
          nextDueOdometer: dueOdometer,
          daysBeforeAlert: 7,
          kmBeforeAlert: 500,
          isActive: true,
        }
        await addReminder(entry)
        return 'ok'
      }

      case 'add_document': {
        const expiryDate = str(p.expiryDate)
        if (!expiryDate) return 'Error: a document needs an expiry date.'
        const docType = mapEnum(p.type, DOCUMENT_TYPES, 'other')
        await addDocument({
          vehicleId,
          type: docType as never,
          title: str(p.title) ?? docType.replace(/_/g, ' '),
          expiryDate,
          notes: str(p.notes),
        })
        return 'ok'
      }

      case 'update_vehicle': {
        const patch: Record<string, unknown> = {}
        if (str(p.name)) patch.name = str(p.name)
        if (num(p.odometer) !== undefined) patch.odometer = num(p.odometer)
        if (str(p.colour)) patch.colour = str(p.colour)
        if (str(p.plateNumber)) patch.plateNumber = str(p.plateNumber)
        if (Object.keys(patch).length === 0) return 'Error: nothing to update.'
        await updateVehicle(vehicleId, patch)
        return 'ok'
      }

      case 'update_settings': {
        const patch: Record<string, unknown> = {}
        if (p.language === 'en' || p.language === 'bn') patch.language = p.language
        if (p.theme === 'light' || p.theme === 'dark' || p.theme === 'system') patch.theme = p.theme
        if (str(p.currency)) patch.currency = str(p.currency)
        if (p.distanceUnit === 'km' || p.distanceUnit === 'mi') patch.distanceUnit = p.distanceUnit
        if (p.volumeUnit === 'L' || p.volumeUnit === 'gal') patch.volumeUnit = p.volumeUnit
        if (Object.keys(patch).length === 0) return 'Error: no valid setting to change.'
        useSettingsStore.getState().update(patch)
        return 'ok'
      }

      case 'navigate_to': {
        const screen = typeof p.screen === 'string' ? p.screen : 'home'
        navigate(SCREEN_ROUTES[screen] ?? '/')
        return 'ok'
      }

      case 'get_stats_summary':
        return JSON.stringify(await statsSummary(vehicleId, str(p.period) ?? 'month'))

      case 'list_recent_logs':
        // Cap the row count: the result is fed back to the model as input
        // tokens (and billed as credits), so a hallucinated limit like 100
        // must not dump the whole history into the prompt.
        return JSON.stringify(
          await recentLogs(vehicleId, str(p.type) ?? 'fuel', Math.min(num(p.limit) ?? 5, 20)),
        )

      case 'compare_periods':
        return JSON.stringify(
          await comparePeriods(vehicleId, str(p.unit) ?? 'month'),
        )

      case 'get_vehicle_overview':
        return JSON.stringify(await vehicleOverview(vehicleId))

      case 'delete_recent_log': {
        const type = str(p.type) ?? 'fuel'
        const which = Math.max(1, num(p.which) ?? 1)
        return await deleteRecentLog(vehicleId, type, which)
      }

      case 'delete_vehicle': {
        await deleteVehicle(vehicleId)
        // Reselect a remaining vehicle so no screen reads the deleted one.
        const remaining = await db.vehicles.orderBy('createdAt').reverse().toArray()
        useVehicleStore.getState().setActiveVehicle(remaining[0]?.id ?? null)
        return 'ok'
      }

      case 'clear_all_data':
        return await clearVehicleData(vehicleId)

      default:
        return `Error: unknown tool ${call.name}.`
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : 'could not complete the action.'}`
  }
}

async function bumpOdometer(vehicleId: string, odometer: number): Promise<void> {
  const vehicle = await db.vehicles.get(vehicleId)
  if (vehicle && odometer > vehicle.odometer) {
    await updateVehicle(vehicleId, { odometer })
  }
}

function periodStart(period: string): string {
  const now = new Date()
  if (period === 'week') now.setDate(now.getDate() - 7)
  else if (period === 'year') now.setMonth(0, 1)
  else now.setDate(1) // month
  return now.toISOString().slice(0, 10)
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp
/** Group a list into { key: total } by a category field + amount field. */
function breakdown<T>(rows: T[], cat: (r: T) => string, amt: (r: T) => number) {
  const out: Record<string, number> = {}
  for (const r of rows) out[cat(r)] = round((out[cat(r)] ?? 0) + amt(r), 0)
  return out
}

/** Core aggregates for one vehicle within [from, to] (inclusive dates). */
async function windowStats(vehicleId: string, from: string, to: string) {
  const within = (d: string) => d >= from && d <= to
  const fuel = (await db.fuelLogs.where('vehicleId').equals(vehicleId).toArray()).filter((l) => within(l.date))
  const service = (await db.serviceLogs.where('vehicleId').equals(vehicleId).toArray()).filter((l) => within(l.date))
  const expense = (await db.expenses.where('vehicleId').equals(vehicleId).toArray()).filter((l) => within(l.date))

  const odos = fuel.map((l) => l.odometer).filter((o) => o > 0)
  const distance = odos.length >= 2 ? Math.max(...odos) - Math.min(...odos) : 0
  const litres = sum(fuel.map((l) => l.volumeLitres))
  const effs = fuel.map((l) => l.efficiencyKmPerL).filter((e): e is number => typeof e === 'number' && e > 0)
  const avgKmPerL = effs.length ? round(sum(effs) / effs.length, 2) : null
  const fuelCost = sum(fuel.map((l) => l.totalCost))
  const serviceCost = sum(service.map((l) => l.cost))
  const expenseCost = sum(expense.map((l) => l.amount))
  const totalCost = round(fuelCost + serviceCost + expenseCost, 0)

  return {
    fuelCost: round(fuelCost, 0),
    litres: round(litres, 2),
    serviceCost: round(serviceCost, 0),
    expenseCost: round(expenseCost, 0),
    totalCost,
    distanceKm: distance,
    avgKmPerL,
    costPerKm: distance > 0 ? round(totalCost / distance, 2) : null,
    counts: { fuel: fuel.length, service: service.length, expense: expense.length },
    serviceByCategory: breakdown(service, (s) => s.category, (s) => s.cost),
    expenseByCategory: breakdown(expense, (e) => e.category, (e) => e.amount),
  }
}

async function statsSummary(vehicleId: string, period: string) {
  const from = periodStart(period)
  const to = today()
  return { period, ...(await windowStats(vehicleId, from, to)) }
}

/** Length of one rolling window in days, used by compare_periods. */
function windowDays(unit: string): number {
  if (unit === 'week') return 7
  if (unit === 'year') return 365
  return 30
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Compares this rolling window against the immediately preceding one. */
async function comparePeriods(vehicleId: string, unit: string) {
  const len = windowDays(unit)
  const to = today()
  const curFrom = shiftDays(to, -len)
  const prevTo = shiftDays(curFrom, -1)
  const prevFrom = shiftDays(prevTo, -len)
  const current = await windowStats(vehicleId, curFrom, to)
  const previous = await windowStats(vehicleId, prevFrom, prevTo)
  return {
    unit,
    current: { from: curFrom, to, ...current },
    previous: { from: prevFrom, to: prevTo, ...previous },
    delta: {
      totalCost: round(current.totalCost - previous.totalCost, 0),
      fuelCost: round(current.fuelCost - previous.fuelCost, 0),
      litres: round(current.litres - previous.litres, 2),
      avgKmPerL:
        current.avgKmPerL != null && previous.avgKmPerL != null
          ? round(current.avgKmPerL - previous.avgKmPerL, 2)
          : null,
    },
  }
}

/** Whole-life snapshot of a vehicle for "how's my bike doing" questions. */
async function vehicleOverview(vehicleId: string) {
  const vehicle = await db.vehicles.get(vehicleId)
  const fuel = await db.fuelLogs.where('vehicleId').equals(vehicleId).toArray()
  const service = await db.serviceLogs.where('vehicleId').equals(vehicleId).toArray()
  const expense = await db.expenses.where('vehicleId').equals(vehicleId).toArray()
  const reminders = (await db.reminders.where('vehicleId').equals(vehicleId).toArray())
    .filter((r) => r.isActive)
  const effs = fuel.map((l) => l.efficiencyKmPerL).filter((e): e is number => typeof e === 'number' && e > 0)
  const nextReminder = reminders
    .filter((r) => r.nextDueDate)
    .sort((a, b) => (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? ''))[0]
  return {
    name: vehicle?.name,
    odometer: vehicle?.odometer ?? 0,
    lifetime: {
      fuelCost: round(sum(fuel.map((l) => l.totalCost)), 0),
      litres: round(sum(fuel.map((l) => l.volumeLitres)), 2),
      serviceCost: round(sum(service.map((l) => l.cost)), 0),
      expenseCost: round(sum(expense.map((l) => l.amount)), 0),
    },
    avgKmPerL: effs.length ? round(sum(effs) / effs.length, 2) : null,
    activeReminders: reminders.length,
    nextDue: nextReminder
      ? { title: nextReminder.title, date: nextReminder.nextDueDate, odometer: nextReminder.nextDueOdometer }
      : null,
  }
}

/** Deletes the Nth-most-recent record of a type (1 = most recent). */
async function deleteRecentLog(vehicleId: string, type: string, which: number): Promise<string> {
  const pick = <T extends { id: string; date?: string; createdAt?: string }>(arr: T[]) =>
    arr.sort((a, b) => (b.date ?? b.createdAt ?? '').localeCompare(a.date ?? a.createdAt ?? ''))[which - 1]
  if (type === 'service') {
    const row = pick(await db.serviceLogs.where('vehicleId').equals(vehicleId).toArray())
    if (!row) return 'Error: no matching service log to delete.'
    await deleteServiceLog(row.id)
  } else if (type === 'expense') {
    const row = pick(await db.expenses.where('vehicleId').equals(vehicleId).toArray())
    if (!row) return 'Error: no matching expense to delete.'
    await deleteExpense(row.id)
  } else if (type === 'reminder') {
    const row = pick(await db.reminders.where('vehicleId').equals(vehicleId).toArray())
    if (!row) return 'Error: no matching reminder to delete.'
    await deleteReminder(row.id)
  } else {
    const row = pick(await db.fuelLogs.where('vehicleId').equals(vehicleId).toArray())
    if (!row) return 'Error: no matching fuel log to delete.'
    await deleteFuelLog(row.id)
  }
  return 'ok'
}

/** Erases all logs/reminders/documents for a vehicle but keeps the vehicle. */
async function clearVehicleData(vehicleId: string): Promise<string> {
  await db.transaction(
    'rw',
    [db.fuelLogs, db.serviceLogs, db.expenses, db.reminders, db.documents, db.tombstones],
    async () => {
      const entities = [
        ['fuelLogs', db.fuelLogs],
        ['serviceLogs', db.serviceLogs],
        ['expenses', db.expenses],
        ['reminders', db.reminders],
        ['documents', db.documents],
      ] as const
      for (const [name, table] of entities) {
        const ids = await table.where('vehicleId').equals(vehicleId).primaryKeys()
        await table.where('vehicleId').equals(vehicleId).delete()
        await softDeleteTrackMany(name, ids as string[])
      }
    },
  )
  return 'ok'
}

/** Resolves a fuel fill-up's litres + price + total from any subset the user
 * gave, using the saved fuel price as a fallback. Returns { ask } (a short
 * question) when there isn't enough to compute a real entry. */
function resolveFuel(
  litres: number | undefined,
  price: number | undefined,
  total: number | undefined,
  lockedPrice: number | undefined,
): { volumeLitres: number; pricePerLitre: number; totalCost: number } | { ask: string } {
  const ok = (l: number, pr: number, t: number) => ({
    volumeLitres: round(l, 2),
    pricePerLitre: round(pr, 2),
    totalCost: round(t, 0),
  })
  if (litres && price) return ok(litres, price, litres * price)
  if (total && price) return ok(total / price, price, total)
  if (total && litres) return ok(litres, total / litres, total)
  if (total && lockedPrice) return ok(total / lockedPrice, lockedPrice, total)
  if (litres && lockedPrice) return ok(litres, lockedPrice, litres * lockedPrice)
  return { ask: 'How many litres, or what was the price per litre?' }
}

async function recentLogs(vehicleId: string, type: string, limit: number) {
  const take = <T extends { date: string }>(arr: T[]) =>
    arr.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
  if (type === 'service') {
    return take(await db.serviceLogs.where('vehicleId').equals(vehicleId).toArray())
      .map((l) => ({ date: l.date, title: l.title, cost: l.cost }))
  }
  if (type === 'expense') {
    return take(await db.expenses.where('vehicleId').equals(vehicleId).toArray())
      .map((l) => ({ date: l.date, title: l.title, amount: l.amount }))
  }
  if (type === 'reminder') {
    return (await db.reminders.where('vehicleId').equals(vehicleId).toArray())
      .filter((r) => r.isActive)
      .slice(0, limit)
      .map((r) => ({ title: r.title, dueDate: r.nextDueDate, dueOdometer: r.nextDueOdometer }))
  }
  return take(await db.fuelLogs.where('vehicleId').equals(vehicleId).toArray())
    .map((l) => ({ date: l.date, litres: l.volumeLitres, pricePerLitre: l.pricePerLitre, totalCost: l.totalCost, odometer: l.odometer }))
}

/** Hook that returns an executor bound to the router's navigate function. */
export function useToolExecutor() {
  const navigate = useNavigate()
  return useCallback(
    (call: AgentToolCall, vehicleId: string) => executeToolCall(call, vehicleId, navigate),
    [navigate],
  )
}
