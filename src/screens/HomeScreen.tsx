import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { BottomNav } from '@components/layout/BottomNav'
import { Screen } from '@components/layout/Screen'
import { LogRow } from '@components/composed/LogRow'
import { useVehicles } from '@db/queries/useVehicles'
import { useFuelLogs, useMonthlyFuelLogs } from '@db/queries/useFuelLogs'
import { useServiceLogs, useMonthlyServiceLogs } from '@db/queries/useServiceLogs'
import { useExpenses, useMonthlyExpenses } from '@db/queries/useExpenses'
import { useReminders } from '@db/queries/useReminders'
import { useVehicleStore } from '@store/vehicleStore'
import { useCurrency } from '@hooks/useCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { useUnits } from '@hooks/useUnits'
import type { FuelLog, ServiceLog, Expense } from '@/types'
import styles from './HomeScreen.module.css'

type LogEntry =
  | { kind: 'fuel'; log: FuelLog }
  | { kind: 'service'; log: ServiceLog }
  | { kind: 'expense'; log: Expense }

const VEHICLE_ICONS: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', truck: '🚛', bus: '🚌', cng: '🛺', bicycle: '🚲', other: '🚘',
}

export function HomeScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { format: formatMoney, symbol } = useCurrency()
  const { formatEfficiency, formatDistance } = useUnits()
  const [vehiclePicker, setVehiclePicker] = useState(false)

  const vehiclesResult = useVehicles()
  const vehicles = vehiclesResult ?? []
  const vehiclesLoaded = vehiclesResult !== undefined
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)

  const vehicleId = activeVehicleId ?? vehicles[0]?.id ?? ''
  const activeVehicle = vehicles.find((v) => v.id === vehicleId)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const fuelLogs    = useMonthlyFuelLogs(vehicleId, year, month)
  const serviceLogs = useMonthlyServiceLogs(vehicleId, year, month)
  const expenses    = useMonthlyExpenses(vehicleId, year, month)

  const prevFuelLogs    = useMonthlyFuelLogs(vehicleId, prevYear, prevMonth)
  const prevServiceLogs = useMonthlyServiceLogs(vehicleId, prevYear, prevMonth)
  const prevExpenses    = useMonthlyExpenses(vehicleId, prevYear, prevMonth)

  const allFuelLogs    = useFuelLogs(vehicleId)
  const allServiceLogs = useServiceLogs(vehicleId)
  const allExpenses    = useExpenses(vehicleId)
  const reminders      = useReminders(vehicleId)

  const fuelTotal    = useMemo(() => fuelLogs.reduce((s, l) => s + l.totalCost, 0), [fuelLogs])
  const serviceTotal = useMemo(() => serviceLogs.reduce((s, l) => s + l.cost, 0), [serviceLogs])
  const expenseTotal = useMemo(() => expenses.reduce((s, l) => s + l.amount, 0), [expenses])
  const monthTotal   = fuelTotal + serviceTotal + expenseTotal

  const prevTotal = useMemo(() => {
    const pf = prevFuelLogs.reduce((s, l) => s + l.totalCost, 0)
    const ps = prevServiceLogs.reduce((s, l) => s + l.cost, 0)
    const pe = prevExpenses.reduce((s, l) => s + l.amount, 0)
    return pf + ps + pe
  }, [prevFuelLogs, prevServiceLogs, prevExpenses])

  const trendPct = useMemo(() => {
    if (prevTotal === 0) return null
    return ((monthTotal - prevTotal) / prevTotal) * 100
  }, [monthTotal, prevTotal])

  const avgEfficiency = useMemo(() => {
    const valid = fuelLogs.filter((l) => l.efficiencyKmPerL && l.efficiencyKmPerL > 0)
    if (valid.length === 0) return null
    return valid.reduce((s, l) => s + (l.efficiencyKmPerL ?? 0), 0) / valid.length
  }, [fuelLogs])

  const distanceThisMonth = useMemo(() =>
    fuelLogs.reduce((s, l) =>
      l.previousOdometer != null && l.odometer > l.previousOdometer
        ? s + (l.odometer - l.previousOdometer) : s, 0),
    [fuelLogs]
  )

  const currentOdo = activeVehicle?.odometer

  function getReminderUrgency(r: { daysBeforeAlert: number; kmBeforeAlert?: number; dueDate?: string; nextDueDate?: string; dueOdometer?: number; nextDueOdometer?: number; type: string }): 'overdue' | 'urgent' | 'future' {
    const due = r.type === 'repeat' ? (r.nextDueDate ?? r.dueDate) : r.dueDate
    let dateUrgency: 'overdue' | 'urgent' | 'future' = 'future'
    if (due) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const days = Math.floor((new Date(due).getTime() - today.getTime()) / 86400000)
      if (days < 0) dateUrgency = 'overdue'
      else if (days <= r.daysBeforeAlert) dateUrgency = 'urgent'
    }
    const effectiveDueOdo = r.nextDueOdometer ?? r.dueOdometer
    let odoUrgency: 'overdue' | 'urgent' | 'future' = 'future'
    if (effectiveDueOdo != null && currentOdo != null) {
      const remaining = effectiveDueOdo - currentOdo
      if (remaining <= 0) odoUrgency = 'overdue'
      else if (remaining <= (r.kmBeforeAlert ?? 1000)) odoUrgency = 'urgent'
    }
    const order = { overdue: 0, urgent: 1, future: 2 }
    return order[dateUrgency] <= order[odoUrgency] ? dateUrgency : odoUrgency
  }

  const nearReminderCount = useMemo(() =>
    reminders.filter((r) => getReminderUrgency(r) !== 'future').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reminders, currentOdo]
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

  const vehicleLeft = (
    <button
      type="button"
      className={styles.vehicleHeaderBtn}
      onClick={() => setVehiclePicker(true)}
      aria-label="Switch vehicle"
    >
      <span className={styles.vehicleHeaderIcon} aria-hidden="true">
        {activeVehicle ? (VEHICLE_ICONS[activeVehicle.type] ?? '🚘') : '🚗'}
      </span>
      <span className={styles.vehicleHeaderName}>
        {activeVehicle?.name ?? t('home.no_vehicles_title')}
      </span>
      {vehicles.length > 0 && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )

  const pickerModal = vehiclePicker && (
    <>
      <div className={styles.pickerBackdrop} onClick={() => setVehiclePicker(false)} aria-hidden="true" />
      <div className={styles.pickerOverlay} role="dialog" aria-modal="true" aria-label="Switch vehicle">
        <div className={styles.pickerHeader}>
          <span className={styles.pickerTitle}>{t('home.your_vehicles')}</span>
          <button type="button" className={styles.pickerClose} onClick={() => setVehiclePicker(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ul className={styles.pickerList}>
          {vehicles.map((v) => (
            <li key={v.id} className={styles.pickerRow}>
              <button
                type="button"
                className={`${styles.pickerItem} ${v.id === vehicleId ? styles.pickerItemActive : ''}`}
                onClick={() => { setActiveVehicle(v.id); setVehiclePicker(false) }}
              >
                <span className={styles.pickerItemIcon}>{VEHICLE_ICONS[v.type] ?? '🚘'}</span>
                <span className={styles.pickerItemName}>{v.name}</span>
                {v.id === vehicleId && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3 9l5 5 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className={styles.pickerDetailBtn}
                onClick={() => { setVehiclePicker(false); navigate(`/vehicles/${v.id}`) }}
                aria-label={`View details for ${v.name}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={styles.pickerAddItem} onClick={() => { setVehiclePicker(false); navigate('/vehicles/add') }}>
              <span className={styles.pickerItemIcon}>＋</span>
              <span className={styles.pickerItemName}>{t('home.add_vehicle')}</span>
            </button>
          </li>
          {vehicles.length >= 2 && (
            <li>
              <button type="button" className={styles.pickerCompareItem} onClick={() => { setVehiclePicker(false); navigate('/compare') }}>
                <span className={styles.pickerItemIcon}>⚖️</span>
                <span className={styles.pickerItemName}>{t('home.compare_vehicles')}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          )}
        </ul>
      </div>
    </>
  )

  if (!vehiclesLoaded) {
    return <div className={styles.root} />
  }

  if (vehicles.length === 0) {
    return (
      <div className={styles.root}>
        <TopBar left={vehicleLeft} onSettings={() => navigate('/settings')} />
        {pickerModal}
        <Screen paddingBottom="76px">
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🚗</span>
            <p className={styles.emptyTitle}>{t('home.no_vehicles_title')}</p>
            <p className={styles.emptySubtitle}>{t('home.no_vehicles_subtitle')}</p>
            <button className={styles.emptyBtn} onClick={() => navigate('/vehicles/add')}>
              {t('home.add_vehicle')}
            </button>
          </div>
        </Screen>
        <BottomNav activeTab="home" onHome={() => navigate('/')} onAdd={() => navigate('/vehicles/add')} onReminders={() => navigate('/reminders')} reminderCount={nearReminderCount} />
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <TopBar left={vehicleLeft} onSettings={() => navigate('/settings')} />
      {pickerModal}

      <Screen padding="16px" paddingBottom="76px" gap="16px">

        {/* Monthly summary card */}
        <div className={styles.summaryCard}>
          <span className={styles.summaryMonth}>{monthName}</span>

          <div className={styles.summaryMain}>
            <span className={styles.summaryTotal}>{formatMoney(monthTotal)}</span>
            {trendPct !== null && (
              <span className={`${styles.trendBadge} ${trendPct <= 0 ? styles.trendDown : styles.trendUp}`}>
                {trendPct <= 0 ? '↓' : '↑'} {Math.abs(trendPct).toFixed(0)}% {t('home.vs_last_month')}
              </span>
            )}
          </div>

          <div className={styles.costBreakdown}>
            {fuelTotal > 0 && (
              <span className={styles.costChip}>
                ⛽ {formatMoney(fuelTotal, true)}
              </span>
            )}
            {serviceTotal > 0 && (
              <span className={styles.costChip}>
                🔧 {formatMoney(serviceTotal, true)}
              </span>
            )}
            {expenseTotal > 0 && (
              <span className={styles.costChip}>
                💰 {formatMoney(expenseTotal, true)}
              </span>
            )}
          </div>

          {(avgEfficiency != null || distanceThisMonth > 0) && (
            <div className={styles.effRow}>
              {avgEfficiency != null && (
                <span className={styles.effStat}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2ZM7 7V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  {formatEfficiency(avgEfficiency)}
                </span>
              )}
              {avgEfficiency != null && distanceThisMonth > 0 && <span className={styles.effDot}>·</span>}
              {distanceThisMonth > 0 && (
                <span className={styles.effStat}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6c0 3.5 4.5 6.5 4.5 6.5S11.5 9.5 11.5 6c0-2.5-2-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="7" cy="6" r="1.2" fill="currentColor"/>
                  </svg>
                  {formatDistance(distanceThisMonth)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className={styles.actions}>
          {([
            { key: 'fuel' as const, path: '/log/fuel', icon: '⛽', iconClass: styles.actionIconFuel },
            { key: 'service' as const, path: '/log/service', icon: '🔧', iconClass: styles.actionIconService },
            { key: 'expense' as const, path: '/log/expense', icon: '💰', iconClass: styles.actionIconExpense },
          ] as const).map(({ key, path, icon, iconClass }) => (
            <button
              key={path}
              type="button"
              className={styles.actionBtn}
              onClick={() => navigate(path)}
              aria-label={t(`home.${key}`)}
            >
              <span className={`${styles.actionIconWrap} ${iconClass}`} aria-hidden="true">{icon}</span>
              <span className={styles.actionLabel}>+ {t(`home.${key}`)}</span>
            </button>
          ))}
        </div>

        {/* Quick links */}
        <div className={styles.quickLinksSection}>
          <span className={styles.sectionTitle}>{t('home.explore')}</span>
          <div className={styles.quickLinks}>
            {[
              { label: t('home.stats'), icon: '📊', path: '/stats' },
              { label: t('home.reminder'), icon: '🔔', path: '/reminders', badge: nearReminderCount > 0 ? nearReminderCount : undefined },
              { label: t('home.documents'), icon: '📄', path: '/documents' },
              ...(vehicles.length >= 2
                ? [{ label: t('home.compare'), icon: '⚖️', path: '/compare' }]
                : [{ label: t('home.add_vehicle'), icon: '🚘', path: '/vehicles/add' }]),
            ].map(({ label, icon, path, badge }) => (
              <button
                key={path}
                type="button"
                className={styles.quickLink}
                onClick={() => navigate(path)}
                aria-label={label}
              >
                <span className={styles.quickLinkIcon} aria-hidden="true">
                  {icon}
                  {badge != null && <span className={styles.quickLinkBadge}>{badge}</span>}
                </span>
                <span className={styles.quickLinkLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        {recentLogs.length > 0 && (
          <div className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <span className={styles.recentTitle}>{t('home.recent_activity')}</span>
              <button type="button" className={styles.seeAllBtn} onClick={() => navigate('/stats')}>
                {t('home.see_all')}
              </button>
            </div>
            <div className={styles.recentList}>
              {recentLogs.map((entry) => {
                if (entry.kind === 'fuel') {
                  return <LogRow key={entry.log.id} type="fuel" title={t('home.fuel')} subtitle={entry.log.date} amount={entry.log.totalCost} currency={symbol} />
                }
                if (entry.kind === 'service') {
                  return <LogRow key={entry.log.id} type="service" title={entry.log.title} subtitle={entry.log.date} amount={entry.log.cost} currency={symbol} />
                }
                return <LogRow key={entry.log.id} type="expense" title={entry.log.title} subtitle={entry.log.date} amount={entry.log.amount} currency={symbol} />
              })}
            </div>
          </div>
        )}

      </Screen>

      <BottomNav activeTab="home" onHome={() => navigate('/')} onAdd={() => navigate('/log/fuel')} onReminders={() => navigate('/reminders')} reminderCount={nearReminderCount} />
    </div>
  )
}
