import type { ReactNode } from 'react'
import styles from './StatCard.module.css'

interface StatCardProps {
  icon: ReactNode
  iconColor: 'blue' | 'teal' | 'amber' | 'red'
  value: string
  label: string
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string }
  onClick?: () => void
}

export function StatCard({ icon, iconColor, value, label, trend, onClick }: StatCardProps) {
  const cardClass = [styles.card, onClick ? styles.clickable : ''].filter(Boolean).join(' ')

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      aria-label={`${label}: ${value}`}
    >
      <div className={styles.iconRow}>
        <span className={`${styles.iconWrap} ${styles[iconColor]}`} aria-hidden="true">
          {icon}
        </span>
        {trend && (
          <span className={`${styles.trend} ${styles[trend.direction]}`}>
            {trend.label}
          </span>
        )}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  )
}
