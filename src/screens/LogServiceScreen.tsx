import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Select } from '@components/primitives/Select'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addServiceLog, updateServiceLog } from '@db/queries/useServiceLogs'
import type { ServiceCategory, ServiceLog } from '@/types'
import styles from './LogServiceScreen.module.css'

const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'oil_change', label: 'Oil change' },
  { value: 'oil_filter', label: 'Oil filter' },
  { value: 'air_filter', label: 'Air filter' },
  { value: 'fuel_filter', label: 'Fuel filter' },
  { value: 'spark_plug', label: 'Spark plug' },
  { value: 'brake_pad', label: 'Brake pad' },
  { value: 'brake_disc', label: 'Brake disc' },
  { value: 'tire_rotation', label: 'Tire rotation' },
  { value: 'tire_replacement', label: 'Tire replacement' },
  { value: 'wheel_alignment', label: 'Wheel alignment' },
  { value: 'wheel_balancing', label: 'Wheel balancing' },
  { value: 'battery', label: 'Battery' },
  { value: 'coolant', label: 'Coolant' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'ac_service', label: 'AC service' },
  { value: 'chain_service', label: 'Chain service' },
  { value: 'wash', label: 'Wash' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'registration', label: 'Registration' },
  { value: 'other', label: 'Other' },
]

export function LogServiceScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const editLog = (location.state as { editLog?: ServiceLog } | null)?.editLog ?? null
  const isEditing = editLog != null

  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

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
      setCostError('Cost is required')
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
      <TopBar title={isEditing ? 'Edit Service' : 'Log Service'} onBack={() => navigate(-1)} />
      <Screen>
        <Input
          type="date"
          label="Date"
          value={date}
          onChange={setDate}
          id="svc-date"
        />

        <Select
          label="Category"
          options={SERVICE_CATEGORIES}
          value={category ?? ''}
          onChange={(v) => {
            setCategory(v as ServiceCategory)
            if (v !== 'other') setTitle('')
          }}
          placeholder="Select category…"
          id="svc-category"
        />

        {category === 'other' && (
          <Input
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Describe the service…"
            id="svc-title"
          />
        )}

        <Input
          label="Cost (৳)"
          value={costStr}
          onChange={(v) => { setCostStr(v); setCostError('') }}
          inputMode="decimal"
          placeholder="0.00"
          prefix="৳"
          error={costError}
          id="svc-cost"
        />

        <Input
          label="Odometer (km, optional)"
          value={odoStr}
          onChange={setOdoStr}
          inputMode="numeric"
          placeholder="50000"
          suffix="km"
          id="svc-odo"
        />

        {showNotes ? (
          <Input
            label="Note"
            value={notes}
            onChange={setNotes}
            placeholder="Any notes..."
            id="svc-notes"
            multiline
          />
        ) : (
          <button type="button" className={styles.addNoteBtn} onClick={() => setShowNotes(true)}>
            + Add note
          </button>
        )}

        <Button onClick={handleSave} loading={saving} fullWidth>
          {isEditing ? 'Save Changes' : 'Save Service Log'}
        </Button>
      </Screen>
    </div>
  )
}
