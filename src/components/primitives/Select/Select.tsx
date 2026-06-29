import styles from './Select.module.css'

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  options: SelectOption<T>[]
  value: T | ''
  onChange: (value: T) => void
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder,
  error,
  hint,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: SelectProps<T>) {
  const selectClass = [styles.select, error ? styles.hasError : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
          className={selectClass}
          aria-label={ariaLabel ?? (label ? undefined : placeholder)}
          aria-invalid={!!error}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
