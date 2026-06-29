import styles from './HeroCard.module.css'

interface HeroCardProps {
  period: string
  totalAmount: string
  delta?: { direction: 'up' | 'down' | 'neutral'; label: string }
  fuel: string
  service: string
  other: string
}

const DELTA_ICONS = { up: '↑', down: '↓', neutral: '—' }

export function HeroCard({ period, totalAmount, delta, fuel, service, other }: HeroCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.period}>{period}</span>
        {delta && (
          <span className={`${styles.delta} ${styles[delta.direction]}`}>
            {DELTA_ICONS[delta.direction]} {delta.label}
          </span>
        )}
      </div>
      <div className={styles.amount}>{totalAmount}</div>
      <div className={styles.divider} />
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Fuel</span>
          <span className={`${styles.statValue} ${styles.fuel}`}>{fuel}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Service</span>
          <span className={`${styles.statValue} ${styles.service}`}>{service}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Other</span>
          <span className={`${styles.statValue} ${styles.other}`}>{other}</span>
        </div>
      </div>
    </div>
  )
}
