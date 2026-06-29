import type { Vehicle } from '@/types'
import styles from './VehiclePill.module.css'

interface VehiclePillProps {
  vehicle?: Vehicle
  selected: boolean
  onSelect: () => void
  variant?: 'normal' | 'add'
}

const VEHICLE_ICONS: Record<string, string> = {
  car: '🚗',
  motorcycle: '🏍️',
  truck: '🚛',
  bus: '🚌',
  cng: '🛺',
  bicycle: '🚲',
  other: '🚘',
}

export function VehiclePill({ vehicle, selected, onSelect, variant = 'normal' }: VehiclePillProps) {
  const isAdd = variant === 'add' || !vehicle
  const pillClass = [
    styles.pill,
    isAdd ? styles.add : '',
    !isAdd && selected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = isAdd
    ? 'Add vehicle'
    : vehicle?.name ?? `${vehicle?.brand ?? ''} ${vehicle?.model ?? ''}`.trim()

  return (
    <button
      type="button"
      className={pillClass}
      onClick={onSelect}
      aria-pressed={isAdd ? undefined : selected}
      aria-label={isAdd ? 'Add new vehicle' : label}
    >
      <span className={styles.icon} aria-hidden="true">
        {isAdd ? '+' : (vehicle ? VEHICLE_ICONS[vehicle.type] ?? '🚘' : '🚘')}
      </span>
      {label}
    </button>
  )
}
