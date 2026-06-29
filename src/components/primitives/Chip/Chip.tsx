import type { ReactNode } from 'react'
import styles from './Chip.module.css'

interface ChipProps {
  selected: boolean
  onChange: (selected: boolean) => void
  children: ReactNode
  icon?: ReactNode
  disabled?: boolean
  'aria-label'?: string
}

export function Chip({
  selected,
  onChange,
  children,
  icon,
  disabled = false,
  'aria-label': ariaLabel,
}: ChipProps) {
  const classes = [
    styles.chip,
    selected ? styles.selected : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={ariaLabel}
      className={classes}
      disabled={disabled}
      onClick={() => onChange(!selected)}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  )
}
