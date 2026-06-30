import styles from './Screen.module.css'

interface ScreenProps {
  children: React.ReactNode
  padding?: string
  gap?: string
  className?: string
}

export function Screen({ children, padding = '16px', gap = '14px', className }: ScreenProps) {
  return (
    <main
      className={`${styles.screen} ${className ?? ''}`}
      style={{ padding, gap }}
    >
      {children}
    </main>
  )
}
