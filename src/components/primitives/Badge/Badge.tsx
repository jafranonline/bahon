import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  variant: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'repeat'
  size?: 'sm' | 'md'
  children: ReactNode
}

export function Badge({ variant, size = 'md', children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      {children}
    </span>
  )
}
