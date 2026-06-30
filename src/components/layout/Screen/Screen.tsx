import styles from './Screen.module.css'

interface ScreenProps {
  children: React.ReactNode
  padding?: string
  paddingBottom?: string
  gap?: string
  className?: string
}

export function Screen({ children, padding = '18px', paddingBottom, gap = '16px', className }: ScreenProps) {
  const pb = paddingBottom ?? padding
  return (
    <main
      className={`${styles.screen} ${className ?? ''}`}
      style={{
        paddingTop: padding,
        paddingLeft: padding,
        paddingRight: padding,
        paddingBottom: `calc(${pb} + env(safe-area-inset-bottom, 0px))`,
        gap,
      }}
    >
      {children}
    </main>
  )
}
