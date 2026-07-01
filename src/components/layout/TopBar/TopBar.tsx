import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@store/uiStore'
import styles from './TopBar.module.css'

interface TopBarProps {
  title?: string
  subtitle?: string
  onBack?: () => void
  /** Custom drawer-open handler. Defaults to opening the global nav drawer. */
  onMenu?: () => void
  actions?: React.ReactNode
  /** Hide the drawer toggle on screens rendered outside the nav drawer
   * (e.g. the email verify/reset pages). Defaults to shown. */
  showMenu?: boolean
}

/** Bahon logo glyph — matches the mark used in the nav drawer. */
const BrandLogo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 15l1.5-4.5A2 2 0 017.4 9h9.2a2 2 0 011.9 1.5L20 15M4 15h16M4 15v2.5M20 15v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7.5" cy="15" r="1.6" fill="currentColor" />
    <circle cx="16.5" cy="15" r="1.6" fill="currentColor" />
  </svg>
)

export function TopBar({ title, subtitle, onBack, onMenu, actions, showMenu = true }: TopBarProps) {
  const navigate = useNavigate()
  const setDrawerOpen = useUIStore((s) => s.setDrawerOpen)
  const openDrawer = onMenu ?? (() => setDrawerOpen(true))

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          className={styles.brand}
          onClick={() => navigate('/')}
          aria-label="Bahon home"
          type="button"
        >
          <span className={styles.brandLogo} aria-hidden="true"><BrandLogo /></span>
          <span className={styles.brandName}>Bahon</span>
        </button>

        {showMenu && (
          <button className={styles.iconBtn} onClick={openDrawer} aria-label="Open menu" type="button">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {onBack && (
          <button className={styles.iconBtn} onClick={onBack} aria-label="Go back" type="button">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M14 17L9 11l5-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.center}>
        {title && <h1 className={styles.title}>{title}</h1>}
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>

      <div className={styles.right}>{actions}</div>
    </header>
  )
}
