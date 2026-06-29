import type { ReactNode } from 'react'
import styles from './Input.module.css'

interface InputProps {
  type?: 'text' | 'number' | 'date' | 'email'
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  hint?: string
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
  disabled?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal'
  autoComplete?: string
  id?: string
  'aria-label'?: string
}

export function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  hint,
  error,
  prefix,
  suffix,
  disabled = false,
  inputMode,
  autoComplete,
  id,
  'aria-label': ariaLabel,
}: InputProps) {
  const resolvedInputMode =
    inputMode ?? (type === 'number' ? 'decimal' : undefined)

  const rowClass = [
    styles.inputRow,
    error ? styles.hasError : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={rowClass}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={resolvedInputMode}
          autoComplete={autoComplete}
          className={styles.input}
          aria-label={ariaLabel ?? (label ? undefined : placeholder)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {hint && !error && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
