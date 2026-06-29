import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Chip } from '@components/primitives/Chip'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useVehicleStore } from '@store/vehicleStore'
import { addVehicle, useVehicles } from '@db/queries/useVehicles'
import type { VehicleType, FuelType } from '@/types'
import styles from './AddVehicleScreen.module.css'

type TypeOption = { value: VehicleType; label: string; subtitle: string; icon: string }
type FuelOption = { value: FuelType; label: string }

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'car', label: 'Car / SUV', subtitle: 'Sedan, hatchback, SUV', icon: '🚗' },
  { value: 'motorcycle', label: 'Motorcycle', subtitle: 'Bike, scooter', icon: '🏍️' },
  { value: 'truck', label: 'Truck', subtitle: 'Pickup, cargo truck', icon: '🚛' },
  { value: 'bus', label: 'Bus / Other', subtitle: 'Bus, minivan, other', icon: '🚌' },
]

const FUEL_OPTIONS: FuelOption[] = [
  { value: 'octane', label: 'Octane' },
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'cng', label: 'CNG' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
]

export function AddVehicleScreen() {
  const navigate = useNavigate()
  const activeVehicleId = useVehicleStore((s) => s.activeVehicleId)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)
  const vehicles = useVehicles()

  const [vehicleType, setVehicleType] = useState<VehicleType>('car')
  const [fuelType, setFuelType] = useState<FuelType>('petrol')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [yearStr, setYearStr] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [odoStr, setOdoStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  async function handleSave() {
    if (!name.trim()) {
      setNameError('Nickname is required')
      return
    }
    setNameError('')
    setSaving(true)
    try {
      const id = await addVehicle({
        name: name.trim(),
        brand: brand.trim() || '',
        model: model.trim() || '',
        year: yearStr ? parseInt(yearStr, 10) : new Date().getFullYear(),
        type: vehicleType,
        fuelType,
        odometer: odoStr ? parseFloat(odoStr) : 0,
        plateNumber: plateNumber.trim() || undefined,
      })
      if (!activeVehicleId || vehicles.length === 0) {
        setActiveVehicle(id)
      }
      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title="Add Vehicle" onBack={() => navigate(-1)} />
      <Screen>
        <div>
          <p className={styles.sectionLabel}>Vehicle type</p>
          <div className={styles.typeGrid}>
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={[styles.typeCard, vehicleType === opt.value ? styles.typeCardSelected : ''].filter(Boolean).join(' ')}
                onClick={() => setVehicleType(opt.value)}
                aria-pressed={vehicleType === opt.value}
                aria-label={opt.label}
              >
                <span className={styles.typeIcon} aria-hidden="true">{opt.icon}</span>
                <span className={styles.typeLabel}>{opt.label}</span>
                <span className={styles.typeSubtitle}>{opt.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={styles.sectionLabel}>Fuel type</p>
          <div className={styles.chipRow}>
            {FUEL_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={fuelType === opt.value}
                onChange={() => setFuelType(opt.value)}
                aria-label={opt.label}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <Input
          label="Nickname"
          value={name}
          onChange={(v) => { setName(v); setNameError('') }}
          placeholder="e.g. My Honda"
          error={nameError}
          id="vehicle-name"
        />

        <Input
          label="Brand (optional)"
          value={brand}
          onChange={setBrand}
          placeholder="e.g. Honda"
          id="vehicle-brand"
        />

        <Input
          label="Model (optional)"
          value={model}
          onChange={setModel}
          placeholder="e.g. CB150R"
          id="vehicle-model"
        />

        <Input
          label="Year (optional)"
          value={yearStr}
          onChange={setYearStr}
          inputMode="numeric"
          placeholder={String(new Date().getFullYear())}
          id="vehicle-year"
        />

        <Input
          label="Plate number (optional)"
          value={plateNumber}
          onChange={setPlateNumber}
          placeholder="e.g. Dhaka Metro-Ga 11-1234"
          id="vehicle-plate"
        />

        <Input
          label="Current odometer (optional)"
          value={odoStr}
          onChange={setOdoStr}
          inputMode="numeric"
          placeholder="0"
          suffix="km"
          id="vehicle-odo"
        />

        <Button onClick={handleSave} loading={saving} fullWidth>
          Add Vehicle
        </Button>
      </Screen>
    </div>
  )
}
