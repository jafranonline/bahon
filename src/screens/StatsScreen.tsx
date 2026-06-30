import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { StackedBarChart } from '@components/charts/StackedBarChart'
import { LineChart } from '@components/charts/LineChart'
import { useVehicleStore } from '@store/vehicleStore'
import { useSettingsStore } from '@store/settingsStore'
import { useFuelLogs } from '@db/queries/useFuelLogs'
import { useServiceLogs } from '@db/queries/useServiceLogs'
import { useExpenses } from '@db/queries/useExpenses'
import { useCurrency } from '@hooks/useCurrency'
import { useExport } from '@hooks/useExport'
import styles from './StatsScreen.module.css'

type Tab = 'summary' | 'fuel' | 'service'

function last6Months(): { label: string; key: string }[] {
  const result: { label: string; key: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('default', { month: 'short' })
    result.push({ label, key })
  }
  return result
}

function monthKey(date: string) {
  return date.slice(0, 7)
}

export function StatsScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('summary')
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const efficiencyUnit = useSettingsStore((s) => s.efficiencyUnit)
  const distanceUnit = useSettingsStore((s) => s.distanceUnit)
  const { format, symbol } = useCurrency()
  const { exportAsCSV } = useExport()

  const fuelLogs = useFuelLogs(activeVehicleId ?? '')
  const serviceLogs = useServiceLogs(activeVehicleId ?? '')
  const expenses = useExpenses(activeVehicleId ?? '')

  const months = useMemo(() => last6Months(), [])

  const nowYear = new Date().getFullYear()

  const ytdFuel = useMemo(() =>
    fuelLogs.filter(l => l.date.startsWith(String(nowYear))).reduce((s, l) => s + l.totalCost, 0),
    [fuelLogs, nowYear]
  )
  const ytdService = useMemo(() =>
    serviceLogs.filter(l => l.date.startsWith(String(nowYear))).reduce((s, l) => s + l.cost, 0),
    [serviceLogs, nowYear]
  )
  const ytdExpense = useMemo(() =>
    expenses.filter(l => l.date.startsWith(String(nowYear))).reduce((s, l) => s + l.amount, 0),
    [expenses, nowYear]
  )
  const ytdTotal = ytdFuel + ytdService + ytdExpense

  const effField = efficiencyUnit === 'MPG' ? 'efficiencyMPG' : efficiencyUnit === 'L/100km' ? 'efficiencyL100km' : 'efficiencyKmPerL'

  const efficiencies = useMemo(() =>
    fuelLogs.filter(l => l[effField] != null).slice(0, 10).reverse(),
    [fuelLogs, effField]
  )
  const avgEfficiency = useMemo(() => {
    const valid = fuelLogs.filter(l => l[effField] != null)
    if (valid.length === 0) return 0
    return valid.reduce((s, l) => s + (l[effField] ?? 0), 0) / valid.length
  }, [fuelLogs, effField])

  const totalDistanceKm = useMemo(() => {
    if (fuelLogs.length < 2) return 0
    const sorted = [...fuelLogs].sort((a, b) => a.odometer - b.odometer)
    return sorted[sorted.length - 1].odometer - sorted[0].odometer
  }, [fuelLogs])

  const totalDistance = distanceUnit === 'mi' ? totalDistanceKm * 0.621371 : totalDistanceKm
  const costPerDistLabel = distanceUnit === 'mi' ? 'Cost per mi' : 'Cost per km'

  const monthlyFuel = useMemo(() =>
    months.map(m => fuelLogs.filter(l => monthKey(l.date) === m.key).reduce((s, l) => s + l.totalCost, 0)),
    [fuelLogs, months]
  )
  const monthlyService = useMemo(() =>
    months.map(m => serviceLogs.filter(l => monthKey(l.date) === m.key).reduce((s, l) => s + l.cost, 0)),
    [serviceLogs, months]
  )
  const monthlyExpense = useMemo(() =>
    months.map(m => expenses.filter(l => monthKey(l.date) === m.key).reduce((s, l) => s + l.amount, 0)),
    [expenses, months]
  )

  const barSeries = [
    { label: 'Fuel', data: monthlyFuel, color: '#EF9F27' },
    { label: 'Service', data: monthlyService, color: '#1baf7a' },
    { label: 'Other', data: monthlyExpense, color: '#2a78d6' },
  ]

  const yearMonths = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const d = new Date(selectedYear, i, 1)
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        key: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
      }
    }),
    [selectedYear]
  )

  const yearlyFuel = useMemo(() =>
    yearMonths.map(m => fuelLogs.filter(l => monthKey(l.date) === m.key).reduce((s, l) => s + l.totalCost, 0)),
    [fuelLogs, yearMonths]
  )
  const yearlyService = useMemo(() =>
    yearMonths.map(m => serviceLogs.filter(l => monthKey(l.date) === m.key).reduce((s, l) => s + l.cost, 0)),
    [serviceLogs, yearMonths]
  )
  const yearlyExpense = useMemo(() =>
    yearMonths.map(m => expenses.filter(l => monthKey(l.date) === m.key).reduce((s, l) => s + l.amount, 0)),
    [expenses, yearMonths]
  )

  const yearlyBarSeries = [
    { label: 'Fuel', data: yearlyFuel, color: '#EF9F27' },
    { label: 'Service', data: yearlyService, color: '#1baf7a' },
    { label: 'Other', data: yearlyExpense, color: '#2a78d6' },
  ]

  const yearTotalSpend = useMemo(() =>
    [...yearlyFuel, ...yearlyService, ...yearlyExpense].reduce((s, v) => s + v, 0),
    [yearlyFuel, yearlyService, yearlyExpense]
  )

  const yearAvgMonthly = yearTotalSpend / 12

  const minYear = useMemo(() => {
    const all = [...fuelLogs, ...serviceLogs, ...expenses]
    if (!all.length) return currentYear
    return Math.min(...all.map(l => parseInt(l.date.slice(0, 4), 10)))
  }, [fuelLogs, serviceLogs, expenses, currentYear])

  const effLineLabels = efficiencies.map(l => l.date.slice(5))
  const effLineData = efficiencies.map(l => parseFloat((l[effField] ?? 0).toFixed(2)))

  const hasNoData = fuelLogs.length === 0 && serviceLogs.length === 0 && expenses.length === 0

  async function handleExport() {
    await exportAsCSV('fuel')
    await exportAsCSV('service')
    await exportAsCSV('expenses')
  }

  return (
    <div className={styles.root}>
      <TopBar title="Stats" onBack={() => navigate(-1)} />
      <nav aria-label="Stats sections">
      <div className={styles.tabBar} role="tablist" aria-label="Stats tabs">
        {(['summary', 'fuel', 'service'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className={[styles.tabBtn, tab === t ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
            onClick={() => setTab(t)}
            aria-selected={tab === t}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      </nav>

      <Screen>
        {tab === 'summary' && (
          <>
            {hasNoData ? (
              <p className={styles.empty}>No data yet. Start by logging a fuel fill-up.</p>
            ) : (
              <>
                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>YTD Total</span>
                    <span className={styles.kpiValue}>{format(ytdTotal)}</span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{costPerDistLabel}</span>
                    <span className={styles.kpiValue}>
                      {totalDistance > 0 ? `${symbol}${(ytdTotal / totalDistance).toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Avg mileage</span>
                    <span className={styles.kpiValue}>
                      {avgEfficiency > 0 ? `${avgEfficiency.toFixed(1)} ${efficiencyUnit}` : '—'}
                    </span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>YTD Fuel</span>
                    <span className={styles.kpiValue}>{format(ytdFuel)}</span>
                  </div>
                </div>

                <div className={styles.chartCard}>
                  <p className={styles.chartTitle}>6-month spend</p>
                  <div className={styles.barLegend}>
                    {barSeries.map(s => (
                      <span key={s.label} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                  <StackedBarChart labels={months.map(m => m.label)} series={barSeries} />
                </div>

                {efficiencies.length >= 2 && (
                  <div className={styles.chartCard}>
                    <p className={styles.chartTitle}>Efficiency trend (last {efficiencies.length} fill-ups)</p>
                    <LineChart
                      labels={effLineLabels}
                      data={effLineData}
                      yLabel={efficiencyUnit}
                      color="#2a78d6"
                    />
                  </div>
                )}

                <div className={styles.chartCard}>
                  <div className={styles.yearNav}>
                    <button
                      type="button"
                      className={styles.yearNavBtn}
                      onClick={() => setSelectedYear(y => y - 1)}
                      disabled={selectedYear <= minYear}
                      aria-label="Previous year"
                    >←</button>
                    <span className={styles.yearLabel}>{selectedYear}</span>
                    <button
                      type="button"
                      className={styles.yearNavBtn}
                      onClick={() => setSelectedYear(y => y + 1)}
                      disabled={selectedYear >= currentYear}
                      aria-label="Next year"
                    >→</button>
                  </div>
                  <div className={styles.barLegend} style={{ marginTop: 10 }}>
                    {yearlyBarSeries.map(s => (
                      <span key={s.label} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                  <StackedBarChart labels={yearMonths.map(m => m.label)} series={yearlyBarSeries} />
                  <div className={styles.yearSummaryRow}>
                    <div className={styles.yearStat}>
                      <span className={styles.yearStatLabel}>Total spend</span>
                      <span className={styles.yearStatValue}>{format(yearTotalSpend)}</span>
                    </div>
                    <div className={styles.yearStat}>
                      <span className={styles.yearStatLabel}>Avg / month</span>
                      <span className={styles.yearStatValue}>{format(yearAvgMonthly)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'fuel' && (
          <>
            {fuelLogs.length === 0 ? (
              <p className={styles.empty}>No fuel logs yet.</p>
            ) : (
              <>
                {efficiencies.length >= 2 && (
                  <div className={styles.chartCard}>
                    <p className={styles.chartTitle}>Efficiency trend</p>
                    <LineChart labels={effLineLabels} data={effLineData} yLabel="km/L" />
                  </div>
                )}
                <div className={styles.logTable}>
                  <div className={styles.logHeader}>
                    <span>Date</span>
                    <span>Litres</span>
                    <span>Total</span>
                    <span>{efficiencyUnit}</span>
                  </div>
                  {fuelLogs.map(log => (
                    <div key={log.id} className={styles.logRow}>
                      <span>{log.date.slice(5)}</span>
                      <span>{log.volumeLitres.toFixed(1)} L</span>
                      <span>{format(log.totalCost)}</span>
                      <span>{log[effField] != null ? (log[effField] as number).toFixed(1) : '—'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'service' && (
          <>
            {serviceLogs.length === 0 ? (
              <p className={styles.empty}>No service logs yet.</p>
            ) : (
              <div className={styles.logTable}>
                <div className={styles.svcHeader}>
                  <span>Date</span>
                  <span>Category</span>
                  <span>Cost</span>
                </div>
                {serviceLogs.map(log => (
                  <div key={log.id} className={styles.svcRow}>
                    <span>{log.date.slice(5)}</span>
                    <span className={styles.categoryCell}>{log.category.replace(/_/g, ' ')}</span>
                    <span>{format(log.cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button type="button" className={styles.exportBtn} onClick={handleExport} aria-label="Export data as CSV">
          Export CSV
        </button>
      </Screen>
    </div>
  )
}
