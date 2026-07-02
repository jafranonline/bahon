import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { BottomNav } from '@components/layout/BottomNav'
import { Screen } from '@components/layout/Screen'
import { LoadingScreen } from '@components/layout/LoadingScreen/LoadingScreen'
import { VehicleSelector } from '@components/domain/VehicleSelector/VehicleSelector'
import { LogRow } from '@components/composed/LogRow'
import { FuelTypeIcon, ServiceTypeIcon, ExpenseTypeIcon } from '@components/primitives/icons'
import { useVehicles } from '@db/queries/useVehicles'
import { useRecentFuelLogs, useMonthlyFuelLogs } from '@db/queries/useFuelLogs'
import { useRecentServiceLogs, useMonthlyServiceLogs } from '@db/queries/useServiceLogs'
import { useRecentExpenses, useMonthlyExpenses } from '@db/queries/useExpenses'
import { useReminders } from '@db/queries/useReminders'
import { useVehicleStore } from '@store/vehicleStore'
import { useUIStore } from '@store/uiStore'
import { useCurrency } from '@hooks/useCurrency'
import { useTranslation } from '@hooks/useTranslation'
import { useUnits } from '@hooks/useUnits'
import type { FuelLog, ServiceLog, Expense, Reminder } from '@/types'
import styles from './HomeScreen.module.css'

type LogEntry =
  | { kind: 'fuel'; log: FuelLog }
  | { kind: 'service'; log: ServiceLog }
  | { kind: 'expense'; log: Expense }

type Urgency = 'overdue' | 'urgent' | 'future'

/* Stroke icon set matching the bottom nav's line style, replacing the
 * platform-dependent emoji so every icon renders identically everywhere. */
const icon = (path: ReactNode, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

const StatsIcon = () => icon(<path d="M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3" />)

const BellIcon = () => icon(<>
  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
</>)

const DocumentIcon = () => icon(<>
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  <path d="M14 2v6h6M16 13H8M16 17H8" />
</>)

const CompareIcon = () => icon(<>
  <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
  <path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
</>)

const CarIcon = () => icon(<>
  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
  <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M9 17h6" />
</>)

const GaugeIcon = () => icon(<path d="m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0" />, 14)

const RouteIcon = () => icon(<>
  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
  <circle cx="12" cy="10" r="3" />
</>, 14)

const InboxIcon = () => icon(<>
  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
</>, 28)

const ChevronIcon = () => icon(<path d="m9 18 6-6-6-6" />, 16)

export function HomeScreen() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const openMenu = useUIStore((s) => s.setDrawerOpen)
  const { format: formatMoney, symbol } = useCurrency()
  const { formatEfficiency, formatDistance } = useUnits()

  const vehiclesResult = useVehicles()
  const vehicles = vehiclesResult ?? []
  const vehiclesLoaded = vehiclesResult !== undefined
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

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

  // Only the 5 newest of each type are needed for "Recent activity" — a
  // limited index read keeps the home screen from loading the entire log
  // history into memory.
  const recentFuelLogs    = useRecentFuelLogs(vehicleId, 5)
  const recentServiceLogs = useRecentServiceLogs(vehicleId, 5)
  const recentExpenses    = useRecentExpenses(vehicleId, 5)
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

  function getReminderUrgency(r: Reminder): Urgency {
    const due = r.type === 'repeat' ? (r.nextDueDate ?? r.dueDate) : r.dueDate
    let dateUrgency: Urgency = 'future'
    if (due) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const days = Math.floor((new Date(due).getTime() - today.getTime()) / 86400000)
      if (days < 0) dateUrgency = 'overdue'
      else if (days <= r.daysBeforeAlert) dateUrgency = 'urgent'
    }
    const effectiveDueOdo = r.nextDueOdometer ?? r.dueOdometer
    let odoUrgency: Urgency = 'future'
    if (effectiveDueOdo != null && currentOdo != null) {
      const remaining = effectiveDueOdo - currentOdo
      if (remaining <= 0) odoUrgency = 'overdue'
      else if (remaining <= (r.kmBeforeAlert ?? 1000)) odoUrgency = 'urgent'
    }
    const order = { overdue: 0, urgent: 1, future: 2 }
    return order[dateUrgency] <= order[odoUrgency] ? dateUrgency : odoUrgency
  }

  const dueSoon = useMemo(() => {
    const order = { overdue: 0, urgent: 1, future: 2 }
    return reminders
      .map((r) => ({ reminder: r, urgency: getReminderUrgency(r) }))
      .filter((e) => e.urgency !== 'future')
      .sort((a, b) => order[a.urgency] - order[b.urgency])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders, currentOdo])

  const nearReminderCount = dueSoon.length

  const recentLogs = useMemo((): LogEntry[] => {
    const merged: LogEntry[] = [
      ...recentFuelLogs.map((log) => ({ kind: 'fuel' as const, log })),
      ...recentServiceLogs.map((log) => ({ kind: 'service' as const, log })),
      ...recentExpenses.map((log) => ({ kind: 'expense' as const, log })),
    ]
    merged.sort((a, b) => b.log.date.localeCompare(a.log.date))
    return merged.slice(0, 5)
  }, [recentFuelLogs, recentServiceLogs, recentExpenses])

  const locale = i18n.language?.startsWith('bn') ? 'bn' : 'en'
  const monthName = now.toLocaleString(locale, { month: 'long', year: 'numeric' })

  function reminderDueLabel(r: Reminder, urgency: Urgency): string {
    if (urgency === 'overdue') return t('home.overdue')
    const due = r.type === 'repeat' ? (r.nextDueDate ?? r.dueDate) : r.dueDate
    if (due) return due
    const dueOdo = r.nextDueOdometer ?? r.dueOdometer
    if (dueOdo != null && currentOdo != null) {
      return t('home.km_left', { distance: formatDistance(dueOdo - currentOdo) })
    }
    return ''
  }

  if (!vehiclesLoaded) {
    // Data still resolving — show the spinner (not a blank screen) so a slow
    // first query never looks like a broken page.
    return <LoadingScreen />
  }

  if (vehicles.length === 0) {
    return (
      <div className={styles.root}>
        <TopBar
          title="Bahon"
          onMenu={() => openMenu(true)}
          actions={<VehicleSelector />}
        />
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

  const breakdown = [
    { key: 'fuel' as const,    label: t('home.fuel'),    amount: fuelTotal,    segClass: styles.segFuel,    dotClass: styles.dotFuel },
    { key: 'service' as const, label: t('home.service'), amount: serviceTotal, segClass: styles.segService, dotClass: styles.dotService },
    { key: 'expense' as const, label: t('home.expense'), amount: expenseTotal, segClass: styles.segExpense, dotClass: styles.dotExpense },
  ].filter((b) => b.amount > 0)

  return (
    <div className={styles.root}>
      <TopBar
        title="Bahon"
        onMenu={() => openMenu(true)}
        actions={<VehicleSelector />}
      />

      <Screen padding="16px" paddingBottom="76px" gap="16px">

        {/* Monthly summary card */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryTopRow}>
            <span className={styles.summaryMonth}>{monthName}</span>
            {currentOdo != null && currentOdo > 0 && (
              <span className={styles.odoPill} aria-label={`${t('home.odometer')}: ${formatDistance(currentOdo)}`}>
                <GaugeIcon />
                {formatDistance(currentOdo)}
              </span>
            )}
          </div>

          <div className={styles.summaryMain}>
            <span className={styles.summaryTotal}>{formatMoney(monthTotal)}</span>
            {trendPct !== null && (
              <span className={`${styles.trendBadge} ${trendPct <= 0 ? styles.trendDown : styles.trendUp}`}>
                {trendPct <= 0 ? '↓' : '↑'} {Math.abs(trendPct).toFixed(0)}% {t('home.vs_last_month')}
              </span>
            )}
          </div>

          {breakdown.length > 0 ? (
            <>
              <div className={styles.splitBar} aria-hidden="true">
                {breakdown.map((b) => (
                  <span key={b.key} className={`${styles.splitSeg} ${b.segClass}`} style={{ flexGrow: b.amount }} />
                ))}
              </div>
              <div className={styles.legend}>
                {breakdown.map((b) => (
                  <span key={b.key} className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${b.dotClass}`} aria-hidden="true" />
                    {b.label}
                    <span className={styles.legendAmount}>{formatMoney(b.amount, true)}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.emptyMonth}>
              <span className={styles.emptyMonthText}>{t('home.empty_month_title')}</span>
              <button type="button" className={styles.emptyMonthBtn} onClick={() => navigate('/log/fuel')}>
                {t('home.empty_month_cta')}
              </button>
            </div>
          )}

          {(avgEfficiency != null || distanceThisMonth > 0) && (
            <div className={styles.effRow}>
              {avgEfficiency != null && (
                <span className={styles.effStat}>
                  <GaugeIcon />
                  {formatEfficiency(avgEfficiency)}
                </span>
              )}
              {avgEfficiency != null && distanceThisMonth > 0 && <span className={styles.effDot}>·</span>}
              {distanceThisMonth > 0 && (
                <span className={styles.effStat}>
                  <RouteIcon />
                  {formatDistance(distanceThisMonth)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reminders needing attention — surfaced instead of hiding behind the nav badge */}
        {dueSoon.length > 0 && (
          <div className={styles.dueSection}>
            <span className={styles.sectionTitle}>{t('home.due_soon')}</span>
            <div className={styles.dueList}>
              {dueSoon.slice(0, 2).map(({ reminder, urgency }) => (
                <button
                  key={reminder.id}
                  type="button"
                  className={styles.dueRow}
                  onClick={() => navigate('/reminders')}
                  aria-label={`${reminder.title} — ${reminderDueLabel(reminder, urgency)}`}
                >
                  <span
                    className={`${styles.dueDot} ${urgency === 'overdue' ? styles.dueDotOverdue : styles.dueDotUrgent}`}
                    aria-hidden="true"
                  />
                  <span className={styles.dueTitle}>{reminder.title}</span>
                  <span className={`${styles.dueWhen} ${urgency === 'overdue' ? styles.dueWhenOverdue : ''}`}>
                    {reminderDueLabel(reminder, urgency)}
                  </span>
                  <span className={styles.dueChevron} aria-hidden="true"><ChevronIcon /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className={styles.actions}>
          {([
            { key: 'fuel' as const, path: '/log/fuel', Icon: FuelTypeIcon, iconClass: styles.actionIconFuel },
            { key: 'service' as const, path: '/log/service', Icon: ServiceTypeIcon, iconClass: styles.actionIconService },
            { key: 'expense' as const, path: '/log/expense', Icon: ExpenseTypeIcon, iconClass: styles.actionIconExpense },
          ] as const).map(({ key, path, Icon, iconClass }) => (
            <button
              key={path}
              type="button"
              className={styles.actionBtn}
              onClick={() => navigate(path)}
              aria-label={t(`home.${key}`)}
            >
              <span className={`${styles.actionIconWrap} ${iconClass}`} aria-hidden="true"><Icon /></span>
              <span className={styles.actionLabel}>+ {t(`home.${key}`)}</span>
            </button>
          ))}
        </div>

        {/* Quick links */}
        <div className={styles.quickLinksSection}>
          <span className={styles.sectionTitle}>{t('home.explore')}</span>
          <div className={styles.quickLinks}>
            {[
              { label: t('home.stats'), Icon: StatsIcon, path: '/stats' },
              { label: t('home.reminder'), Icon: BellIcon, path: '/reminders', badge: nearReminderCount > 0 ? nearReminderCount : undefined },
              { label: t('home.documents'), Icon: DocumentIcon, path: '/documents' },
              ...(vehicles.length >= 2
                ? [{ label: t('home.compare'), Icon: CompareIcon, path: '/compare' }]
                : [{ label: t('home.add_vehicle'), Icon: CarIcon, path: '/vehicles/add' }]),
            ].map(({ label, Icon, path, badge }) => (
              <button
                key={path}
                type="button"
                className={styles.quickLink}
                onClick={() => navigate(path)}
                aria-label={label}
              >
                <span className={styles.quickLinkIcon} aria-hidden="true">
                  <Icon />
                  {badge != null && <span className={styles.quickLinkBadge}>{badge}</span>}
                </span>
                <span className={styles.quickLinkLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className={styles.recentSection}>
          <div className={styles.recentHeader}>
            <span className={styles.recentTitle}>{t('home.recent_activity')}</span>
            {recentLogs.length > 0 && (
              <button type="button" className={styles.seeAllBtn} onClick={() => navigate('/stats')}>
                {t('home.see_all')}
              </button>
            )}
          </div>
          {recentLogs.length > 0 ? (
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
          ) : (
            <div className={styles.recentEmpty}>
              <span className={styles.recentEmptyIcon} aria-hidden="true"><InboxIcon /></span>
              <span className={styles.recentEmptyTitle}>{t('home.no_activity_title')}</span>
              <span className={styles.recentEmptySubtitle}>{t('home.no_activity_subtitle')}</span>
            </div>
          )}
        </div>

      </Screen>

      <BottomNav activeTab="home" onHome={() => navigate('/')} onAdd={() => navigate('/log/fuel')} onReminders={() => navigate('/reminders')} reminderCount={nearReminderCount} />
    </div>
  )
}
