import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { SegmentedControl } from '@components/primitives/SegmentedControl'
import { Chip } from '@components/primitives/Chip'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { useVehicle } from '@db/queries/useVehicles'
import { addReminder, updateReminder } from '@db/queries/useReminders'
import { useUnits } from '@hooks/useUnits'
import type { Reminder, ReminderRepeatUnit, DistanceUnit } from '@/types'
import styles from './AddReminderScreen.module.css'

type ReminderType = 'one-time' | 'repeat'

function toKm(value: number, unit: DistanceUnit): number {
  return unit === 'mi' ? value * 1.60934 : value
}

function displayDist(km: number, unit: DistanceUnit): string {
  const v = unit === 'mi' ? km * 0.621371 : km
  return `${Math.round(v).toLocaleString()} ${unit}`
}

export function AddReminderScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const editReminder = (location.state as { editReminder?: Reminder } | null)?.editReminder
  const isEdit = !!editReminder

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const vehicle = useVehicle(activeVehicleId ?? '')
  const currentOdo = vehicle?.odometer
  const { distanceUnit } = useUnits()

  const repeatUnits: { value: ReminderRepeatUnit; label: string }[] = [
    { value: 'daily', label: t('reminder.units.daily') },
    { value: 'weekly', label: t('reminder.units.weekly') },
    { value: 'monthly', label: t('reminder.units.monthly') },
    { value: 'yearly', label: t('reminder.units.yearly') },
    { value: 'km', label: t('reminder.every_dist', { unit: distanceUnit }) },
  ]

  const [type, setType] = useState<ReminderType>(editReminder?.type ?? 'one-time')
  const [triggerMode, setTriggerMode] = useState<'date' | 'odometer'>(
    editReminder?.triggerType === 'odometer' ? 'odometer' : 'date'
  )
  const [title, setTitle] = useState(editReminder?.title ?? '')
  const [dueDate, setDueDate] = useState(editReminder?.dueDate ?? '')
  const [dueOdoStr, setDueOdoStr] = useState(editReminder?.dueOdometer?.toString() ?? '')
  const [repeatUnit, setRepeatUnit] = useState<ReminderRepeatUnit>(editReminder?.repeatUnit ?? 'monthly')
  const [repeatValueStr, setRepeatValueStr] = useState(editReminder?.repeatValue?.toString() ?? '1')
  const [nextDueDate, setNextDueDate] = useState(editReminder?.nextDueDate ?? '')
  const [titleError, setTitleError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) {
      setTitleError(t('reminder.title_required'))
      return
    }
    if (!activeVehicleId) return
    setTitleError('')
    setSaving(true)
    try {
      if (type === 'one-time') {
        const dueOdometer = triggerMode === 'odometer' && dueOdoStr ? parseFloat(dueOdoStr) : undefined
        const date = triggerMode === 'date' ? dueDate || undefined : undefined
        const fields = {
          title: title.trim(),
          type: 'one-time' as const,
          triggerType: triggerMode as 'date' | 'odometer',
          dueDate: date,
          dueOdometer,
        }
        if (isEdit && editReminder.id) {
          await updateReminder(editReminder.id, fields)
        } else {
          await addReminder({ vehicleId: activeVehicleId, ...fields, daysBeforeAlert: 3, kmBeforeAlert: 1000, isActive: true })
        }
      } else {
        const repeatValueKm = isEdit
          ? parseFloat(repeatValueStr) || 1
          : repeatUnit === 'km'
            ? toKm(parseFloat(repeatValueStr) || 1, distanceUnit)
            : parseInt(repeatValueStr, 10) || 1
        const fields = {
          title: title.trim(),
          type: 'repeat' as const,
          triggerType: (repeatUnit === 'km' ? 'odometer' : 'date') as 'date' | 'odometer',
          repeatUnit,
          repeatValue: repeatValueKm,
          nextDueDate: nextDueDate || undefined,
        }
        if (isEdit && editReminder.id) {
          await updateReminder(editReminder.id, fields)
        } else {
          await addReminder({ vehicleId: activeVehicleId, ...fields, daysBeforeAlert: 3, kmBeforeAlert: 1000, isActive: true })
        }
      }

      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={isEdit ? t('reminder.edit') : t('reminder.new')} onBack={() => navigate(-1)} />
      <Screen>
        <SegmentedControl
          options={[
            { value: 'one-time', label: t('reminder.one_time') },
            { value: 'repeat', label: t('reminder.repeat') },
          ]}
          value={type}
          onChange={(v) => setType(v as ReminderType)}
          aria-label={t('reminder.add')}
        />

        <Input
          label={t('reminder.name')}
          value={title}
          onChange={(v) => { setTitle(v); setTitleError('') }}
          placeholder={t('reminder.name_placeholder')}
          error={titleError}
          id="rem-title"
        />

        {type === 'one-time' && (
          <>
            <div>
              <p className={styles.fieldLabel}>{t('reminder.trigger_by')}</p>
              <div className={styles.chipRow}>
                <Chip
                  selected={triggerMode === 'date'}
                  onChange={() => setTriggerMode('date')}
                  aria-label={t('reminder.due_date_chip')}
                >
                  {t('reminder.due_date_chip')}
                </Chip>
                <Chip
                  selected={triggerMode === 'odometer'}
                  onChange={() => setTriggerMode('odometer')}
                  aria-label={t('reminder.at_odometer')}
                >
                  {t('reminder.at_odometer')}
                </Chip>
              </div>
            </div>

            {triggerMode === 'date' && (
              <Input
                type="date"
                label={t('reminder.due_date')}
                value={dueDate}
                onChange={setDueDate}
                id="rem-due-date"
              />
            )}

            {triggerMode === 'odometer' && (
              <div>
                <Input
                  label={t('reminder.target_odometer')}
                  value={dueOdoStr}
                  onChange={setDueOdoStr}
                  inputMode="numeric"
                  placeholder="55000"
                  suffix="km"
                  id="rem-due-odo"
                />
                {currentOdo != null && (
                  <p className={styles.odoHint}>
                    {t('reminder.current_prefix')}{displayDist(currentOdo, distanceUnit)}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {type === 'repeat' && (
          <>
            <div>
              <p className={styles.fieldLabel}>{t('reminder.repeat_every')}</p>
              <div className={styles.chipRow}>
                {repeatUnits.map(u => (
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
              label={t('reminder.interval')}
              value={repeatValueStr}
              onChange={setRepeatValueStr}
              inputMode="numeric"
              placeholder={repeatUnit === 'km' ? '5000' : '1'}
              suffix={repeatUnit === 'km' ? distanceUnit : undefined}
              id="rem-repeat-val"
            />

            {repeatUnit !== 'km' && (
              <Input
                type="date"
                label={t('reminder.starting_date')}
                value={nextDueDate}
                onChange={setNextDueDate}
                id="rem-next-date"
              />
            )}
          </>
        )}

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEdit ? t('common.save_changes') : t('reminder.save')}
        </Button>
      </Screen>
    </div>
  )
}
