import { useState } from 'react'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { SegmentedControl } from '@components/primitives/SegmentedControl'
import { Badge } from '@components/primitives/Badge'
import { Chip } from '@components/primitives/Chip'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { useVehicle } from '@db/queries/useVehicles'
import {
  useReminders,
  addReminder,
  dismissReminder,
} from '@db/queries/useReminders'
import type { Reminder, ReminderRepeatUnit } from '@/types'
import styles from './RemindersScreen.module.css'

type ReminderType = 'one-time' | 'repeat'

const REPEAT_UNITS: { value: ReminderRepeatUnit; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'km', label: 'Every N km' },
]

function getEffectiveDueDate(r: Reminder): string | undefined {
  return r.type === 'repeat' ? (r.nextDueDate ?? r.dueDate) : r.dueDate
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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
  currentOdo?: number
}

function ReminderCard({ reminder, onDismiss, currentOdo }: ReminderCardProps) {
  const urgency = getUrgency(reminder, currentOdo)
  const due = getEffectiveDueDate(reminder)
  const daysUntil = due ? getDaysUntil(due) : null
  const effectiveDueOdo = reminder.nextDueOdometer ?? reminder.dueOdometer
  const kmRemaining = effectiveDueOdo != null && currentOdo != null
    ? effectiveDueOdo - currentOdo
    : null

  return (
    <div className={[styles.card, urgency === 'overdue' ? styles.cardOverdue : urgency === 'urgent' ? styles.cardUrgent : ''].filter(Boolean).join(' ')}>
      <div className={styles.cardTop}>
        <span className={styles.cardTitle}>{reminder.title}</span>
        <div className={styles.cardBadges}>
          {urgency === 'overdue' && <Badge variant="danger" size="sm">Overdue</Badge>}
          {urgency === 'urgent' && daysUntil !== null && daysUntil >= 0 && (
            <Badge variant="warning" size="sm">{daysUntil === 0 ? 'Today' : `${daysUntil} days`}</Badge>
          )}
          {urgency === 'urgent' && daysUntil === null && kmRemaining !== null && (
            <Badge variant="warning" size="sm">{kmRemaining.toLocaleString()} km left</Badge>
          )}
          {urgency === 'overdue' && kmRemaining !== null && kmRemaining <= 0 && daysUntil === null && (
            <Badge variant="danger" size="sm">{Math.abs(kmRemaining).toLocaleString()} km over</Badge>
          )}
          {reminder.type === 'repeat' && <Badge variant="accent" size="sm">Repeat</Badge>}
        </div>
      </div>
      {due && (
        <span className={styles.cardDue}>Due: {due}</span>
      )}
      {(reminder.nextDueOdometer ?? reminder.dueOdometer) != null && (
        <span className={styles.cardDue}>At: {(reminder.nextDueOdometer ?? reminder.dueOdometer)!.toLocaleString()} km</span>
      )}
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={onDismiss}
        aria-label={`Dismiss reminder: ${reminder.title}`}
      >
        Dismiss
      </button>
    </div>
  )
}

export function RemindersScreen() {
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const reminders = useReminders(activeVehicleId ?? undefined)
  const vehicle = useVehicle(activeVehicleId ?? '')
  const currentOdo = vehicle?.odometer

  const [type, setType] = useState<ReminderType>('one-time')
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueOdoStr, setDueOdoStr] = useState('')
  const [repeatUnit, setRepeatUnit] = useState<ReminderRepeatUnit>('monthly')
  const [repeatValueStr, setRepeatValueStr] = useState('1')
  const [nextDueDate, setNextDueDate] = useState('')
  const [daysBeforeStr, setDaysBeforeStr] = useState('3')
  const [kmBeforeStr, setKmBeforeStr] = useState('1000')
  const [titleError, setTitleError] = useState('')
  const [saving, setSaving] = useState(false)

  const sorted = [...reminders].sort((a, b) => {
    const ua = getUrgency(a, currentOdo)
    const ub = getUrgency(b, currentOdo)
    return URGENCY_ORDER[ua] - URGENCY_ORDER[ub]
  })

  async function handleSave() {
    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }
    if (!activeVehicleId) return
    setTitleError('')
    setSaving(true)
    try {
      const daysBefore = parseInt(daysBeforeStr, 10) || 3
      const kmBefore = parseInt(kmBeforeStr, 10) || 1000

      if (type === 'one-time') {
        await addReminder({
          vehicleId: activeVehicleId,
          title: title.trim(),
          type: 'one-time',
          triggerType: dueDate && dueOdoStr ? 'both' : dueDate ? 'date' : 'odometer',
          dueDate: dueDate || undefined,
          dueOdometer: dueOdoStr ? parseFloat(dueOdoStr) : undefined,
          daysBeforeAlert: daysBefore,
          kmBeforeAlert: kmBefore,
          isActive: true,
        })
      } else {
        await addReminder({
          vehicleId: activeVehicleId,
          title: title.trim(),
          type: 'repeat',
          triggerType: repeatUnit === 'km' ? 'odometer' : 'date',
          repeatUnit,
          repeatValue: parseInt(repeatValueStr, 10) || 1,
          nextDueDate: nextDueDate || undefined,
          daysBeforeAlert: daysBefore,
          kmBeforeAlert: kmBefore,
          isActive: true,
        })
      }

      setTitle('')
      setDueDate('')
      setDueOdoStr('')
      setNextDueDate('')
      setDaysBeforeStr('3')
      setKmBeforeStr('1000')
    } finally {
      setSaving(false)
    }
  }

  async function handleDismiss(id: string) {
    await dismissReminder(id, currentOdo ?? 0)
  }

  return (
    <div className={styles.root}>
      <TopBar title="Reminders" />
      <Screen>
        {sorted.length === 0 ? (
          <p className={styles.empty}>No active reminders. Add one below.</p>
        ) : (
          <div className={styles.list}>
            {sorted.map(r => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onDismiss={() => handleDismiss(r.id)}
                currentOdo={currentOdo}
              />
            ))}
          </div>
        )}

        <div className={styles.form}>
          <p className={styles.formTitle}>Add reminder</p>

          <SegmentedControl
            options={[
              { value: 'one-time', label: 'One-time' },
              { value: 'repeat', label: 'Repeat' },
            ]}
            value={type}
            onChange={(v) => setType(v as ReminderType)}
            aria-label="Reminder type"
          />

          <Input
            label="Title"
            value={title}
            onChange={(v) => { setTitle(v); setTitleError('') }}
            placeholder="e.g. Oil change due"
            error={titleError}
            id="rem-title"
          />

          {type === 'one-time' && (
            <>
              <Input
                type="date"
                label="Due date (optional)"
                value={dueDate}
                onChange={setDueDate}
                id="rem-due-date"
              />
              <Input
                label="Due odometer (optional)"
                value={dueOdoStr}
                onChange={setDueOdoStr}
                inputMode="numeric"
                placeholder="55000"
                suffix="km"
                id="rem-due-odo"
              />
            </>
          )}

          {type === 'repeat' && (
            <>
              <div>
                <p className={styles.fieldLabel}>Repeat every</p>
                <div className={styles.chipRow}>
                  {REPEAT_UNITS.map(u => (
                    <Chip
                      key={u.value}
                      selected={repeatUnit === u.value}
                      onChange={() => setRepeatUnit(u.value)}
                      aria-label={u.label}
                    >
                      {u.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <Input
                label="Interval"
                value={repeatValueStr}
                onChange={setRepeatValueStr}
                inputMode="numeric"
                placeholder="1"
                id="rem-repeat-val"
              />
              <Input
                type="date"
                label="Starting date (optional)"
                value={nextDueDate}
                onChange={setNextDueDate}
                id="rem-next-date"
              />
            </>
          )}

          <Input
            label="Alert days before"
            value={daysBeforeStr}
            onChange={setDaysBeforeStr}
            inputMode="numeric"
            placeholder="3"
            suffix="days"
            id="rem-days-before"
          />

          <Button onClick={handleSave} loading={saving} fullWidth>
            Save Reminder
          </Button>
        </div>
      </Screen>
    </div>
  )
}
