import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { BottomNav } from '@components/layout/BottomNav'
import { Screen } from '@components/layout/Screen'
import { VehiclePill } from '@components/composed/VehiclePill'
import { HeroCard } from '@components/composed/HeroCard'
import { DonutChart } from '@components/charts/DonutChart'
import { StatCard } from '@components/composed/StatCard'
import { LogRow } from '@components/composed/LogRow'
import { useVehicles } from '@db/queries/useVehicles'
import {
  useFuelLogs,
  useMonthlyFuelLogs,
} from '@db/queries/useFuelLogs'
import {
  useServiceLogs,
  useMonthlyServiceLogs,
} from '@db/queries/useServiceLogs'
import {
  useExpenses,
  useMonthlyExpenses,
} from '@db/queries/useExpenses'
import { useReminders } from '@db/queries/useReminders'
import { useVehicleStore } from '@store/vehicleStore'
import { useUIStore } from '@store/uiStore'
import { useCurrency } from '@hooks/useCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { useUnits } from '@hooks/useUnits'
import type { FuelLog, ServiceLog, Expense } from '@/types'
import styles from './HomeScreen.module.css'

type LogEntry =
  | { kind: 'fuel'; log: FuelLog }
  | { kind: 'service'; log: ServiceLog }
  | { kind: 'expense'; log: Expense }

export function HomeScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { format: formatMoney, symbol } = useCurrency()
  const { formatEfficiency, formatDistance } = useUnits()
  const setDrawerOpen = useUIStore((s) => s.setDrawerOpen)

  const vehicles = useVehicles()
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)

  const vehicleId = activeVehicleId ?? vehicles[0]?.id ?? ''

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const fuelLogs = useMonthlyFuelLogs(vehicleId, year, month)
  const serviceLogs = useMonthlyServiceLogs(vehicleId, year, month)
  const expenses = useMonthlyExpenses(vehicleId, year, month)

  const prevFuelLogs = useMonthlyFuelLogs(vehicleId, prevYear, prevMonth)
  const prevServiceLogs = useMonthlyServiceLogs(vehicleId, prevYear, prevMonth)
  const prevExpenses = useMonthlyExpenses(vehicleId, prevYear, prevMonth)

  const allFuelLogs = useFuelLogs(vehicleId)
  const allServiceLogs = useServiceLogs(vehicleId)
  const allExpenses = useExpenses(vehicleId)
  const reminders = useReminders(vehicleId)

  const fuelTotal = useMemo(() => fuelLogs.reduce((s, l) => s + l.totalCost, 0), [fuelLogs])
  const serviceTotal = useMemo(() => serviceLogs.reduce((s, l) => s + l.cost, 0), [serviceLogs])
  const expenseTotal = useMemo(() => expenses.reduce((s, l) => s + l.amount, 0), [expenses])
  const monthTotal = fuelTotal + serviceTotal + expenseTotal

  const prevTotal = useMemo(() => {
    const pf = prevFuelLogs.reduce((s, l) => s + l.totalCost, 0)
    const ps = prevServiceLogs.reduce((s, l) => s + l.cost, 0)
    const pe = prevExpenses.reduce((s, l) => s + l.amount, 0)
    return pf + ps + pe
  }, [prevFuelLogs, prevServiceLogs, prevExpenses])

  const delta = useMemo(() => {
    if (prevTotal === 0) return undefined
    const pct = Math.abs(((monthTotal - prevTotal) / prevTotal) * 100).toFixed(0)
    return {
      direction: monthTotal <= prevTotal ? ('down' as const) : ('up' as const),
      label: `${pct}% vs last month`,
    }
  }, [monthTotal, prevTotal])

  const avgEfficiency = useMemo(() => {
    const valid = fuelLogs.filter((l) => l.efficiencyKmPerL && l.efficiencyKmPerL > 0)
    if (valid.length === 0) return null
    return valid.reduce((s, l) => s + (l.efficiencyKmPerL ?? 0), 0) / valid.length
  }, [fuelLogs])

  const distanceThisMonth = useMemo(
    () =>
      fuelLogs.reduce((s, l) => {
        if (l.previousOdometer != null && l.odometer > l.previousOdometer) {
          return s + (l.odometer - l.previousOdometer)
        }
        return s
      }, 0),
    [fuelLogs]
  )

  const totalFuelled = useMemo(
    () => fuelLogs.reduce((s, l) => s + l.volumeLitres, 0),
    [fuelLogs]
  )

  const recentLogs = useMemo((): LogEntry[] => {
    const merged: LogEntry[] = [
      ...allFuelLogs.map((log) => ({ kind: 'fuel' as const, log })),
      ...allServiceLogs.map((log) => ({ kind: 'service' as const, log })),
      ...allExpenses.map((log) => ({ kind: 'expense' as const, log })),
    ]
    merged.sort((a, b) => b.log.date.localeCompare(a.log.date))
    return merged.slice(0, 5)
  }, [allFuelLogs, allServiceLogs, allExpenses])

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  if (vehicles.length === 0) {
    return (
      <div className={styles.root}>
        <TopBar title="Bahon" onSettings={() => setDrawerOpen(true)} />
        <Screen>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🚗</span>
            <p className={styles.emptyTitle}>{t('home.no_vehicles_title')}</p>
            <p className={styles.emptySubtitle}>{t('home.no_vehicles_subtitle')}</p>
            <button
              className={styles.emptyBtn}
              onClick={() => navigate('/vehicles/add')}
              aria-label={t('home.add_vehicle')}
            >
              {t('home.add_vehicle')}
            </button>
          </div>
        </Screen>
        <BottomNav
          onStats={() => navigate('/stats')}
          onAdd={() => navigate('/vehicles/add')}
          onReminders={() => navigate('/reminders')}
        />
      </div>
    )
  }

  const donutData = [
    { label: t('home.fuel'), value: fuelTotal, color: 'var(--amber-400)' },
    { label: t('home.service'), value: serviceTotal, color: 'var(--teal-400)' },
    { label: t('home.expense'), value: expenseTotal, color: 'var(--red-400)' },
  ].filter((d) => d.value > 0)

  return (
    <div className={styles.root}>
      <TopBar title="Bahon" subtitle={monthName} onSettings={() => setDrawerOpen(true)} />

      <Screen>
        <div className={styles.vehicleStrip} role="list" aria-label="Your vehicles">
          {vehicles.map((v) => (
            <div key={v.id} role="listitem" className={styles.vehiclePillWrap}>
              <VehiclePill
                vehicle={v}
                selected={vehicleId === v.id}
                onSelect={() => setActiveVehicle(v.id)}
              />
              {vehicleId === v.id && (
                <button
                  type="button"
                  className={styles.vehicleDetailBtn}
                  onClick={() => navigate(`/vehicles/${v.id}`)}
                  aria-label={`View details for ${v.name}`}
                >
                  ›
                </button>
              )}
            </div>
          ))}
          <div role="listitem">
            <VehiclePill
              selected={false}
              onSelect={() => navigate('/vehicles/add')}
              variant="add"
            />
          </div>
        </div>

        <HeroCard
          period={monthName}
          totalAmount={formatMoney(monthTotal)}
          delta={delta}
          fuel={formatMoney(fuelTotal, true)}
          service={formatMoney(serviceTotal, true)}
          other={formatMoney(expenseTotal, true)}
        />

        {donutData.length > 0 && (
          <div className={styles.donutCard}>
            <DonutChart data={donutData} size={90} ariaLabel="Monthly expense breakdown" />
            <div className={styles.donutLegend}>
              {donutData.map(({ label, value, color }) => (
                <div key={label} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: color }} />
                  <span className={styles.legendLabel}>{label}</span>
                  <span className={styles.legendValue}>{formatMoney(value, true)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.statGrid}>
          <StatCard
            icon={<span aria-hidden="true">⛽</span>}
            iconColor="amber"
            value={avgEfficiency != null ? formatEfficiency(avgEfficiency) : '—'}
            label={t('home.avg_mileage')}
          />
          <StatCard
            icon={<span aria-hidden="true">📍</span>}
            iconColor="blue"
            value={distanceThisMonth > 0 ? formatDistance(distanceThisMonth) : '—'}
            label={t('home.distance')}
          />
          <StatCard
            icon={<span aria-hidden="true">🛢</span>}
            iconColor="teal"
            value={totalFuelled > 0 ? `${totalFuelled.toFixed(1)} L` : '—'}
            label={t('home.fuelled')}
          />
          <StatCard
            icon={<span aria-hidden="true">🔔</span>}
            iconColor="red"
            value={String(reminders.length)}
            label={t('home.due_services')}
            onClick={reminders.length > 0 ? () => navigate('/reminders') : undefined}
          />
        </div>

        <div className={styles.quickAdd}>
          {(
            [
              { key: 'fuel' as const, path: '/log/fuel', color: 'var(--amber-400)' },
              { key: 'service' as const, path: '/log/service', color: 'var(--teal-400)' },
              { key: 'expense' as const, path: '/log/expense', color: 'var(--red-400)' },
              { key: 'reminder' as const, path: '/reminders', color: 'var(--blue-400)' },
            ]
          ).map(({ key, path, color }) => (
            <button
              key={key}
              className={styles.quickAddBtn}
              onClick={() => navigate(path)}
              aria-label={`Add ${t(`home.${key}`)}`}
              style={{ borderColor: color, color }}
            >
              + {t(`home.${key}`)}
            </button>
          ))}
        </div>

        {recentLogs.length > 0 && (
          <>
            <div className={styles.sectionHeader}>{t('home.recent_activity')}</div>
            {recentLogs.map((entry) => {
              if (entry.kind === 'fuel') {
                return (
                  <LogRow
                    key={entry.log.id}
                    type="fuel"
                    title={t('home.fuel')}
                    subtitle={entry.log.date}
                    amount={entry.log.totalCost}
                    currency={symbol}
                  />
                )
              }
              if (entry.kind === 'service') {
                return (
                  <LogRow
                    key={entry.log.id}
                    type="service"
                    title={entry.log.title}
                    subtitle={entry.log.date}
                    amount={entry.log.cost}
                    currency={symbol}
                  />
                )
              }
              return (
                <LogRow
                  key={entry.log.id}
                  type="expense"
                  title={entry.log.title}
                  subtitle={entry.log.date}
                  amount={entry.log.amount}
                  currency={symbol}
                />
              )
            })}
          </>
        )}
      </Screen>

      <BottomNav
        onStats={() => navigate('/stats')}
        onAdd={() => navigate('/log/fuel')}
        onReminders={() => navigate('/reminders')}
      />
    </div>
  )
}
