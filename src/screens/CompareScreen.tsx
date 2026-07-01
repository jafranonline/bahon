import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { BottomNav } from '@components/layout/BottomNav'
import { useVehicles } from '@db/queries/useVehicles'
import { useFuelLogs } from '@db/queries/useFuelLogs'
import { useServiceLogs } from '@db/queries/useServiceLogs'
import { useExpenses } from '@db/queries/useExpenses'
import { useCurrency } from '@hooks/useCurrency'
import { useUnits } from '@hooks/useUnits'
import { useReminderCount } from '@hooks/useReminderCount'
import styles from './CompareScreen.module.css'

type Period = 'month' | '3months' | 'year' | 'all'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '3months', label: '3 months' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

const VEHICLE_ICONS: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', truck: '🚛', bus: '🚌', cng: '🛺', bicycle: '🚲', other: '🚘',
}

function getDateBound(period: Period): string | null {
  if (period === 'all') return null
  const now = new Date()
  if (period === 'month') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }
  if (period === '3months') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  }
  if (period === 'year') {
    return `${now.getFullYear()}-01-01`
  }
  return null
}

interface MetricRowProps {
  label: string
  aValue: number
  bValue: number
  formatValue: (v: number) => string
  lowerIsBetter?: boolean
}

function MetricRow({ label, aValue, bValue, formatValue, lowerIsBetter = true }: MetricRowProps) {
  const total = aValue + bValue
  const aWidth = total > 0 ? Math.round((aValue / total) * 100) : 50
  const bWidth = 100 - aWidth
  const hasData = total > 0
  const aWins = lowerIsBetter ? (aValue > 0 && (bValue === 0 || aValue <= bValue)) : (aValue > 0 && aValue >= bValue)
  const bWins = lowerIsBetter ? (bValue > 0 && (aValue === 0 || bValue < aValue)) : (bValue > 0 && bValue > aValue)

  return (
    <div className={styles.metricRow}>
      <div className={styles.metricValues}>
        <span className={`${styles.metricVal} ${styles.metricValA} ${aWins ? styles.winner : ''}`}>
          {aValue > 0 ? formatValue(aValue) : '—'}
        </span>
        <span className={styles.metricLabel}>{label}</span>
        <span className={`${styles.metricVal} ${styles.metricValB} ${bWins ? styles.winner : ''}`}>
          {bValue > 0 ? formatValue(bValue) : '—'}
        </span>
      </div>
      {hasData && (
        <div className={styles.bar}>
          <div className={`${styles.barA} ${aWins ? styles.barWinA : ''}`} style={{ width: `${aWidth}%` }} />
          <div className={`${styles.barB} ${bWins ? styles.barWinB : ''}`} style={{ width: `${bWidth}%` }} />
        </div>
      )}
    </div>
  )
}

export function CompareScreen() {
  const navigate = useNavigate()
  const { format: formatMoney } = useCurrency()
  const { formatEfficiency, formatDistance } = useUnits()
  const reminderCount = useReminderCount()

  const vehicles = useVehicles() ?? []
  const [aId, setAId] = useState(() => vehicles[0]?.id ?? '')
  const [bId, setBId] = useState(() => vehicles[1]?.id ?? '')
  const [period, setPeriod] = useState<Period>('month')

  const vA = vehicles.find((v) => v.id === aId)
  const vB = vehicles.find((v) => v.id === bId)

  const from = getDateBound(period)

  const allFuelA = useFuelLogs(aId)
  const allFuelB = useFuelLogs(bId)
  const allSvcA  = useServiceLogs(aId)
  const allSvcB  = useServiceLogs(bId)
  const allExpA  = useExpenses(aId)
  const allExpB  = useExpenses(bId)

  function filterByDate<T extends { date: string }>(arr: T[]): T[] {
    if (!from) return arr
    return arr.filter((r) => r.date >= from)
  }

  const fuelA = useMemo(() => filterByDate(allFuelA), [allFuelA, from])
  const fuelB = useMemo(() => filterByDate(allFuelB), [allFuelB, from])
  const svcA  = useMemo(() => filterByDate(allSvcA),  [allSvcA,  from])
  const svcB  = useMemo(() => filterByDate(allSvcB),  [allSvcB,  from])
  const expA  = useMemo(() => filterByDate(allExpA),  [allExpA,  from])
  const expB  = useMemo(() => filterByDate(allExpB),  [allExpB,  from])

  const fuelCostA = useMemo(() => fuelA.reduce((s, l) => s + l.totalCost, 0), [fuelA])
  const fuelCostB = useMemo(() => fuelB.reduce((s, l) => s + l.totalCost, 0), [fuelB])
  const svcCostA  = useMemo(() => svcA.reduce((s, l) => s + l.cost, 0),      [svcA])
  const svcCostB  = useMemo(() => svcB.reduce((s, l) => s + l.cost, 0),      [svcB])
  const expCostA  = useMemo(() => expA.reduce((s, l) => s + l.amount, 0),    [expA])
  const expCostB  = useMemo(() => expB.reduce((s, l) => s + l.amount, 0),    [expB])

  const totalA = fuelCostA + svcCostA + expCostA
  const totalB = fuelCostB + svcCostB + expCostB

  const volumeA = useMemo(() => fuelA.reduce((s, l) => s + l.volumeLitres, 0), [fuelA])
  const volumeB = useMemo(() => fuelB.reduce((s, l) => s + l.volumeLitres, 0), [fuelB])

  const distanceA = useMemo(() =>
    fuelA.reduce((s, l) => s + (l.previousOdometer != null && l.odometer > l.previousOdometer ? l.odometer - l.previousOdometer : 0), 0),
    [fuelA]
  )
  const distanceB = useMemo(() =>
    fuelB.reduce((s, l) => s + (l.previousOdometer != null && l.odometer > l.previousOdometer ? l.odometer - l.previousOdometer : 0), 0),
    [fuelB]
  )

  const effA = useMemo(() => {
    const valid = fuelA.filter((l) => l.efficiencyKmPerL && l.efficiencyKmPerL > 0)
    return valid.length > 0 ? valid.reduce((s, l) => s + (l.efficiencyKmPerL ?? 0), 0) / valid.length : 0
  }, [fuelA])

  const effB = useMemo(() => {
    const valid = fuelB.filter((l) => l.efficiencyKmPerL && l.efficiencyKmPerL > 0)
    return valid.length > 0 ? valid.reduce((s, l) => s + (l.efficiencyKmPerL ?? 0), 0) / valid.length : 0
  }, [fuelB])

  if (vehicles.length < 2) {
    return (
      <div className={styles.root}>
        <TopBar title="Compare" onBack={() => navigate(-1)} />
        <Screen paddingBottom="76px">
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🚗</span>
            <p className={styles.emptyText}>Add at least 2 vehicles to compare.</p>
          </div>
        </Screen>
        <BottomNav
          onHome={() => navigate('/')}
          onAdd={() => navigate('/log/fuel')}
          onReminders={() => navigate('/reminders')}
          reminderCount={reminderCount}
        />
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <TopBar title="Compare" onBack={() => navigate(-1)} />
      <Screen padding="16px" paddingBottom="76px" gap="16px">

        {/* Vehicle selectors */}
        <div className={styles.vehicleRow}>
          <div className={styles.vehiclePicker}>
            <select
              className={styles.vehicleSelect}
              value={aId}
              onChange={(e) => setAId(e.target.value)}
              aria-label="Vehicle A"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{VEHICLE_ICONS[v.type] ?? '🚘'} {v.name}</option>
              ))}
            </select>
          </div>
          <span className={styles.vs}>vs</span>
          <div className={styles.vehiclePicker}>
            <select
              className={styles.vehicleSelect}
              value={bId}
              onChange={(e) => setBId(e.target.value)}
              aria-label="Vehicle B"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{VEHICLE_ICONS[v.type] ?? '🚘'} {v.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Period pills */}
        <div className={styles.periodRow} role="group" aria-label="Time period">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`${styles.periodPill} ${period === p.value ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendA}>
            <span className={styles.legendDot} style={{ background: 'var(--accent)' }} />
            {vA?.name ?? '—'}
          </span>
          <span className={styles.legendB}>
            {vB?.name ?? '—'}
            <span className={styles.legendDot} style={{ background: 'var(--success)' }} />
          </span>
        </div>

        {/* Costs */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Costs</p>
          <div className={styles.card}>
            <MetricRow label="Total" aValue={totalA} bValue={totalB} formatValue={(v) => formatMoney(v, true)} />
            <div className={styles.divider} />
            <MetricRow label="Fuel" aValue={fuelCostA} bValue={fuelCostB} formatValue={(v) => formatMoney(v, true)} />
            <div className={styles.divider} />
            <MetricRow label="Service" aValue={svcCostA} bValue={svcCostB} formatValue={(v) => formatMoney(v, true)} />
            <div className={styles.divider} />
            <MetricRow label="Other" aValue={expCostA} bValue={expCostB} formatValue={(v) => formatMoney(v, true)} />
          </div>
        </div>

        {/* Efficiency */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Efficiency</p>
          <div className={styles.card}>
            <MetricRow label="Avg efficiency" aValue={effA} bValue={effB} formatValue={formatEfficiency} lowerIsBetter={false} />
            <div className={styles.divider} />
            <MetricRow label="Distance" aValue={distanceA} bValue={distanceB} formatValue={formatDistance} lowerIsBetter={false} />
            <div className={styles.divider} />
            <MetricRow label="Fuel used" aValue={volumeA} bValue={volumeB} formatValue={(v) => `${v.toFixed(1)} L`} />
          </div>
        </div>

      </Screen>

      <BottomNav
        onHome={() => navigate('/')}
        onAdd={() => navigate('/log/fuel')}
        onReminders={() => navigate('/reminders')}
        reminderCount={reminderCount}
      />
    </div>
  )
}
