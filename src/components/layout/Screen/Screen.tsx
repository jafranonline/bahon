import styles from './Screen.module.css'

interface ScreenProps {
  children: React.ReactNode
  padding?: string
  gap?: string
  className?: string
}

export function Screen({ children, padding = '13px 14px', gap = '11px', className }: ScreenProps) {
  return (
    <main
      className={`${styles.screen} ${className ?? ''}`}
      style={{ padding, gap }}
    >
      {children}
    </main>
  )
}
