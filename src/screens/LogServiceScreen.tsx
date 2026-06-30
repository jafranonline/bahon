import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Select } from '@components/primitives/Select'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addServiceLog, updateServiceLog } from '@db/queries/useServiceLogs'
import type { ServiceCategory, ServiceLog } from '@/types'
import styles from './LogServiceScreen.module.css'

export function LogServiceScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const editLog = (location.state as { editLog?: ServiceLog } | null)?.editLog ?? null
  const isEditing = editLog != null

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

  const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
    { value: 'oil_change', label: t('service.categories.oil_change') },
    { value: 'oil_filter', label: t('service.categories.oil_filter') },
    { value: 'air_filter', label: t('service.categories.air_filter') },
    { value: 'fuel_filter', label: t('service.categories.fuel_filter') },
    { value: 'spark_plug', label: t('service.categories.spark_plug') },
    { value: 'brake_pad', label: t('service.categories.brake_pad') },
    { value: 'brake_disc', label: t('service.categories.brake_disc') },
    { value: 'tire_rotation', label: t('service.categories.tire_rotation') },
    { value: 'tire_replacement', label: t('service.categories.tire_replacement') },
    { value: 'wheel_alignment', label: t('service.categories.wheel_alignment') },
    { value: 'wheel_balancing', label: t('service.categories.wheel_balancing') },
    { value: 'battery', label: t('service.categories.battery') },
    { value: 'coolant', label: t('service.categories.coolant') },
    { value: 'transmission', label: t('service.categories.transmission') },
    { value: 'ac_service', label: t('service.categories.ac_service') },
    { value: 'chain_service', label: t('service.categories.chain_service') },
    { value: 'wash', label: t('service.categories.wash') },
    { value: 'inspection', label: t('service.categories.inspection') },
    { value: 'registration', label: t('service.categories.registration') },
    { value: 'other', label: t('service.categories.other') },
  ]

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(editLog?.date ?? today)
  const [category, setCategory] = useState<ServiceCategory | null>(editLog?.category ?? 'oil_change')
  const [title, setTitle] = useState(editLog?.category === 'other' ? (editLog?.title ?? '') : '')
  const [costStr, setCostStr] = useState(editLog?.cost ? String(editLog.cost) : '')
  const [odoStr, setOdoStr] = useState(editLog?.odometer != null ? String(editLog.odometer) : '')
  const [notes, setNotes] = useState(editLog?.notes ?? '')
  const [showNotes, setShowNotes] = useState(!!editLog?.notes)
  const [saving, setSaving] = useState(false)
  const [costError, setCostError] = useState('')

  async function handleSave() {
    const cost = parseFloat(costStr) || 0
    if (cost <= 0) {
      setCostError(t('common.required'))
      return
    }
    setCostError('')
    if (!activeVehicleId) return
    setSaving(true)
    try {
      const payload = {
        date,
        category: category ?? 'other',
        title: title || (category ? SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? '' : ''),
        cost,
        odometer: odoStr ? parseFloat(odoStr) : undefined,
        notes: notes || undefined,
      }
      if (isEditing && editLog.id) {
        await updateServiceLog(editLog.id, payload)
      } else {
        await addServiceLog({ vehicleId: activeVehicleId, ...payload })
      }
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={isEditing ? t('service.edit') : t('service.log')} onBack={() => navigate(-1)} />
      <Screen>
        <Input
          type="date"
          label={t('service.date')}
          value={date}
          onChange={setDate}
          id="svc-date"
        />

        <Select
          label={t('service.category')}
          options={SERVICE_CATEGORIES}
          value={category ?? ''}
          onChange={(v) => {
            setCategory(v as ServiceCategory)
            if (v !== 'other') setTitle('')
          }}
          placeholder={t('common.select')}
          id="svc-category"
        />

        {category === 'other' && (
          <Input
            label={t('service.title')}
            value={title}
            onChange={setTitle}
            placeholder={t('service.describe_placeholder')}
            id="svc-title"
          />
        )}

        <Input
          label={t('service.cost')}
          value={costStr}
          onChange={(v) => { setCostStr(v); setCostError('') }}
          inputMode="decimal"
          placeholder="0.00"
          prefix="৳"
          error={costError}
          required
          id="svc-cost"
        />

        <Input
          label={t('service.odometer')}
          value={odoStr}
          onChange={setOdoStr}
          inputMode="numeric"
          placeholder="50000"
          suffix="km"
          id="svc-odo"
        />

        {showNotes ? (
          <Input
            label={t('common.note')}
            value={notes}
            onChange={setNotes}
            placeholder={t('common.note_placeholder')}
            id="svc-notes"
            multiline
          />
        ) : (
          <button type="button" className={styles.addNoteBtn} onClick={() => setShowNotes(true)}>
            {t('common.add_note')}
          </button>
        )}

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEditing ? t('common.save_changes') : t('service.save')}
        </Button>
      </Screen>
    </div>
  )
}
