import { useCallback } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { db } from '@db/database'
import { addFuelLog, getLastOdometer } from '@db/queries/useFuelLogs'
import { addServiceLog } from '@db/queries/useServiceLogs'
import { addExpense } from '@db/queries/useExpenses'
import { addReminder } from '@db/queries/useReminders'
import { updateVehicle } from '@db/queries/useVehicles'
import { useSettingsStore } from '@store/settingsStore'
import {
  calcTotalCost,
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
  try {
    switch (call.name) {
      case 'add_fuel_log': {
        const volumeLitres = num(p.volumeLitres)
        const pricePerLitre = num(p.pricePerLitre)
        // Only litres + price are required. Odometer is optional — default it to
        // the vehicle's current/last-known reading so the log still saves.
        if (volumeLitres === undefined || pricePerLitre === undefined) {
          return 'Error: a fuel log needs at least the litres and the price.'
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
          totalCost: calcTotalCost(volumeLitres, pricePerLitre),
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
        return JSON.stringify(
          await recentLogs(vehicleId, str(p.type) ?? 'fuel', num(p.limit) ?? 5),
        )

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

async function statsSummary(vehicleId: string, period: string) {
  const from = periodStart(period)
  const inRange = (d: string) => d >= from
  const fuel = (await db.fuelLogs.where('vehicleId').equals(vehicleId).toArray()).filter((l) => inRange(l.date))
  const service = (await db.serviceLogs.where('vehicleId').equals(vehicleId).toArray()).filter((l) => inRange(l.date))
  const expense = (await db.expenses.where('vehicleId').equals(vehicleId).toArray()).filter((l) => inRange(l.date))
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  return {
    period,
    fuel: { count: fuel.length, totalCost: sum(fuel.map((l) => l.totalCost)), totalLitres: sum(fuel.map((l) => l.volumeLitres)) },
    service: { count: service.length, totalCost: sum(service.map((l) => l.cost)) },
    expense: { count: expense.length, totalAmount: sum(expense.map((l) => l.amount)) },
  }
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
