import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Chip } from '@components/primitives/Chip'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addServiceLog } from '@db/queries/useServiceLogs'
import type { ServiceCategory } from '@/types'
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
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState<ServiceCategory | null>(null)
  const [title, setTitle] = useState('')
  const [costStr, setCostStr] = useState('')
  const [odoStr, setOdoStr] = useState('')
  const [shopName, setShopName] = useState('')
  const [notes, setNotes] = useState('')
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
      await addServiceLog({
        vehicleId: activeVehicleId,
        date,
        category: category ?? 'other',
        title: title || (category ? SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? '' : ''),
        cost,
        odometer: odoStr ? parseFloat(odoStr) : undefined,
        shopName: shopName || undefined,
        notes: notes || undefined,
      })
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title="Log Service" onBack={() => navigate(-1)} />
      <Screen>
        <Input
          type="date"
          label="Date"
          value={date}
          onChange={setDate}
          id="svc-date"
        />

        <div>
          <p className={styles.chipLabel}>Category</p>
          <div className={styles.chipRow}>
            {SERVICE_CATEGORIES.map((cat) => (
              <Chip
                key={cat.value}
                selected={category === cat.value}
                onChange={() => setCategory(category === cat.value ? null : cat.value)}
                aria-label={cat.label}
              >
                {cat.label}
              </Chip>
            ))}
          </div>
        </div>

        <Input
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Engine oil change"
          id="svc-title"
        />

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

        <Input
          label="Shop name (optional)"
          value={shopName}
          onChange={setShopName}
          placeholder="e.g. City Motors"
          id="svc-shop"
        />

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={setNotes}
          placeholder="Any notes..."
          id="svc-notes"
        />

        <Button onClick={handleSave} loading={saving} fullWidth>
          Save Service Log
        </Button>
      </Screen>
    </div>
  )
}
