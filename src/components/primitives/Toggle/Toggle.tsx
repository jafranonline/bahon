import { useId } from 'react'
import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}
    >
      <input
        id={id}
        type="checkbox"
        className={styles.hiddenInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-checked={checked}
      />
      <span className={`${styles.track} ${checked ? styles.checked : ''}`}>
        <span className={styles.thumb} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
}
