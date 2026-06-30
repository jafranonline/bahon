import { useState, useRef, useEffect } from 'react'
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
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''
  const accessibleLabel = ariaLabel ?? label ?? placeholder

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  function open() {
    if (disabled) return
    setIsOpen(true)
    setQuery('')
  }

  function close() {
    setIsOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => searchRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  function handleSelect(val: T) {
    onChange(val)
    close()
  }

  const triggerClass = [
    styles.trigger,
    error ? styles.hasError : '',
    isOpen ? styles.open : '',
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

      <button
        type="button"
        id={id}
        className={triggerClass}
        onClick={open}
        disabled={disabled}
        aria-label={accessibleLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={!!error}
      >
        <span className={value ? styles.triggerValue : styles.triggerPlaceholder}>
          {value ? selectedLabel : (placeholder ?? '')}
        </span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronUp : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}

      {isOpen && (
        <>
          <div
            className={styles.backdrop}
            onClick={close}
            aria-hidden="true"
          />
          <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={accessibleLabel}>
            <div className={styles.overlayHeader}>
              <span className={styles.overlayTitle}>{label ?? placeholder ?? ''}</span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={close}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className={styles.searchRow}>
              <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                className={styles.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                aria-label="Search options"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => { setQuery(''); searchRef.current?.focus() }}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <ul
              ref={listRef}
              className={styles.dropdown}
              role="listbox"
              aria-label={accessibleLabel}
            >
              {filtered.length === 0 ? (
                <li className={styles.noResults}>No results</li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    className={`${styles.option} ${opt.value === value ? styles.optionSelected : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span className={styles.optionLabel}>{opt.label}</span>
                    {opt.value === value && (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path
                          d="M3 9l5 5 7-8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
