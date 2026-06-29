import styles from './LogRow.module.css'

const TYPE_ICONS: Record<'fuel' | 'service' | 'expense', string> = {
  fuel: '⛽',
  service: '🔧',
  expense: '💳',
}

interface LogRowProps {
  type: 'fuel' | 'service' | 'expense'
  title: string
  subtitle: string
  amount: number
  currency: string
  onPress?: () => void
}

export function LogRow({ type, title, subtitle, amount, currency, onPress }: LogRowProps) {
  const rowClass = [styles.row, onPress ? styles.pressable : ''].filter(Boolean).join(' ')

  return (
    <div
      className={rowClass}
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') onPress() } : undefined}
      aria-label={`${title}, ${subtitle}, ${currency} ${amount}`}
    >
      <span className={`${styles.iconWrap} ${styles[type]}`} aria-hidden="true">
        {TYPE_ICONS[type]}
      </span>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
      <div className={`${styles.amount} ${styles[type]}`}>
        {currency} {amount.toLocaleString('en-US')}
      </div>
    </div>
  )
}
