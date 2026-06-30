import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { useVehicleStore } from '@store/vehicleStore'
import { useVehicle } from '@db/queries/useVehicles'
import { useReminders, dismissReminder, deleteReminder } from '@db/queries/useReminders'
import { useUnits } from '@hooks/useUnits'
import type { Reminder, DistanceUnit } from '@/types'
import styles from './RemindersScreen.module.css'

function fromKm(km: number, unit: DistanceUnit): number {
  return unit === 'mi' ? km * 0.621371 : km
}

function displayDist(km: number, unit: DistanceUnit): string {
  return `${Math.round(fromKm(km, unit)).toLocaleString()} ${unit}`
}

function getEffectiveDueDate(r: Reminder): string | undefined {
  return r.type === 'repeat' ? (r.nextDueDate ?? r.dueDate) : r.dueDate
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Urgency = 'overdue' | 'urgent' | 'future'

const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, urgent: 1, future: 2 }

function getUrgency(r: Reminder, currentOdo?: number): Urgency {
  const due = getEffectiveDueDate(r)
  let dateUrgency: Urgency = 'future'
  if (due) {
    const days = getDaysUntil(due)
    if (days < 0) dateUrgency = 'overdue'
    else if (days <= r.daysBeforeAlert) dateUrgency = 'urgent'
  }

  let odoUrgency: Urgency = 'future'
  const effectiveDueOdo = r.nextDueOdometer ?? r.dueOdometer
  if (effectiveDueOdo != null && currentOdo != null) {
    const remaining = effectiveDueOdo - currentOdo
    if (remaining <= 0) odoUrgency = 'overdue'
    else if (remaining <= (r.kmBeforeAlert ?? 1000)) odoUrgency = 'urgent'
  }

  return URGENCY_ORDER[dateUrgency] <= URGENCY_ORDER[odoUrgency] ? dateUrgency : odoUrgency
}

interface ReminderCardProps {
  reminder: Reminder
  onDismiss: () => void
  onDelete: () => void
  onEdit: () => void
  currentOdo?: number
  distanceUnit: DistanceUnit
}

function ReminderCard({ reminder, onDismiss, onDelete, onEdit, currentOdo, distanceUnit }: ReminderCardProps) {
  const urgency = getUrgency(reminder, currentOdo)
  const due = getEffectiveDueDate(reminder)
  const daysUntil = due ? getDaysUntil(due) : null
  const effectiveDueOdo = reminder.nextDueOdometer ?? reminder.dueOdometer
  const kmRemaining = effectiveDueOdo != null && currentOdo != null ? effectiveDueOdo - currentOdo : null

  const urgencyClass = urgency === 'overdue' ? styles.cardOverdue : urgency === 'urgent' ? styles.cardUrgent : styles.cardFuture

  let statusText = ''
  let statusClass = ''
  if (urgency === 'overdue') {
    statusText = kmRemaining != null && kmRemaining < 0
      ? `${displayDist(Math.abs(kmRemaining), distanceUnit)} over`
      : daysUntil != null
        ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`
        : 'Overdue'
    statusClass = styles.statusOverdue
  } else if (urgency === 'urgent') {
    statusText = daysUntil === 0 ? 'Due today' : daysUntil != null && daysUntil > 0
      ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`
      : kmRemaining != null
        ? `${displayDist(kmRemaining, distanceUnit)} left`
        : 'Soon'
    statusClass = styles.statusUrgent
  }

  return (
    <div className={`${styles.card} ${urgencyClass}`}>
      <div className={styles.cardAccent} />
      <div className={styles.cardBody}>
        <div className={styles.cardIcon} aria-hidden="true">
          {urgency === 'overdue' ? '🔴' : urgency === 'urgent' ? '🟡' : '🔵'}
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardTop}>
            <span className={styles.cardTitle}>{reminder.title}</span>
            <div className={styles.cardMeta}>
              {reminder.type === 'repeat' && (
                <span className={styles.repeatBadge} title="Repeating reminder">↻</span>
              )}
              {statusText && (
                <span className={`${styles.statusBadge} ${statusClass}`}>{statusText}</span>
              )}
            </div>
          </div>

          <div className={styles.cardDetails}>
            {due && (
              <span className={styles.detailRow}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <rect x="1" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 1v2M9 1v2M1 5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {formatDate(due)}
              </span>
            )}
            {effectiveDueOdo != null && (
              <span className={styles.detailRow}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 4.5V7l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.5 2V1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {displayDist(effectiveDueOdo, distanceUnit)}
                {kmRemaining != null && kmRemaining > 0 && (
                  <span className={styles.remaining}> · {displayDist(kmRemaining, distanceUnit)} away</span>
                )}
              </span>
            )}
          </div>

          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={onDelete}
              aria-label={`Delete reminder: ${reminder.title}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.7 7.3a.5.5 0 0 0 .5.45h5.6a.5.5 0 0 0 .5-.45L11 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              className={styles.editBtn}
              onClick={onEdit}
              aria-label={`Edit reminder: ${reminder.title}`}
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={onDismiss}
              aria-label={`Dismiss reminder: ${reminder.title}`}
            >
              {reminder.type === 'repeat' ? 'Mark done' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RemindersScreen() {
  const navigate = useNavigate()
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const reminders = useReminders(activeVehicleId ?? undefined)
  const vehicle = useVehicle(activeVehicleId ?? '')
  const currentOdo = vehicle?.odometer
  const { distanceUnit } = useUnits()

  const sorted = [...reminders].sort((a, b) => {
    const ua = getUrgency(a, currentOdo)
    const ub = getUrgency(b, currentOdo)
    return URGENCY_ORDER[ua] - URGENCY_ORDER[ub]
  })

  async function handleDismiss(id: string) {
    await dismissReminder(id, currentOdo ?? 0)
  }

  async function handleDelete(id: string) {
    await deleteReminder(id)
  }

  return (
    <div className={styles.root}>
      <TopBar
        title="Reminders"
        onBack={() => navigate(-1)}
        actions={
          <button
            className={styles.addBtn}
            onClick={() => navigate('/reminders/add')}
            aria-label="Add reminder"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add
          </button>
        }
      />
      <Screen>
        {sorted.length > 0 && (
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Active</span>
            <span className={styles.sectionCount}>{sorted.length}</span>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🔔</span>
            <p className={styles.emptyText}>No active reminders</p>
            <p className={styles.emptyHint}>Tap Add to set a reminder for upcoming maintenance</p>
            <button
              className={styles.emptyAddBtn}
              onClick={() => navigate('/reminders/add')}
            >
              Add reminder
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {sorted.map(r => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onDismiss={() => handleDismiss(r.id)}
                onDelete={() => handleDelete(r.id)}
                onEdit={() => navigate('/reminders/add', { state: { editReminder: r } })}
                currentOdo={currentOdo}
                distanceUnit={distanceUnit}
              />
            ))}
          </div>
        )}
      </Screen>
    </div>
  )
}
