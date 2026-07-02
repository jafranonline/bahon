import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@store/uiStore'
import { useAuthStore } from '@store/authStore'
import { useTranslation } from '@hooks/useTranslation'
import { APP_VERSION } from '@utils/constants'
import styles from './NavDrawer.module.css'

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const Icons = {
  home: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke}>
      <path d="M3 10.5L11 3l8 7.5V19a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V10.5z" />
    </svg>
  ),
  stats: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke}>
      <path d="M4 19V9M11 19V4M18 19v-7" />
    </svg>
  ),
  reminders: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke}>
      <path d="M11 3a6 6 0 016 6v4l1.5 2.5h-15L5 13V9a6 6 0 016-6z" />
      <path d="M9 17.5a2 2 0 004 0" />
    </svg>
  ),
  documents: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke}>
      <path d="M6 3h6l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M12 3v4h4M8 12h6M8 15.5h6" />
    </svg>
  ),
  compare: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke}>
      <path d="M11 3v16M4 8l3-3 3 3M4 8v4a3 3 0 006 0M18 14l-3 3-3-3M18 14v-4a3 3 0 00-6 0" />
    </svg>
  ),
  settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6Z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1Z" />
    </svg>
  ),
  about: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke}>
      <circle cx="11" cy="11" r="8" />
      <path d="M11 10v4.5M11 7.2v.2" />
    </svg>
  ),
  account: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke}>
      <circle cx="11" cy="7.5" r="3.5" />
      <path d="M4.5 18a6.5 6.5 0 0113 0" />
    </svg>
  ),
}

interface NavEntry {
  to: string
  label: string
  icon: React.ReactNode
}

/** Slide-in navigation sidebar: app branding + a menu of the main screens.
 * Opened from the TopBar hamburger; state lives in uiStore. */
export function NavDrawer() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const open = useUIStore((s) => s.drawerOpen)
  const setOpen = useUIStore((s) => s.setDrawerOpen)

  const authStatus = useAuthStore((s) => s.status)
  const authUser = useAuthStore((s) => s.user)
  const entitlements = useAuthStore((s) => s.entitlements)
  const signedIn = authStatus === 'authenticated' && authUser != null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const items: NavEntry[] = [
    { to: '/', label: t('nav.home'), icon: Icons.home },
    { to: '/stats', label: t('nav.stats'), icon: Icons.stats },
    { to: '/reminders', label: t('nav.reminders'), icon: Icons.reminders },
    { to: '/documents', label: t('nav.documents'), icon: Icons.documents },
    { to: '/compare', label: t('nav.compare'), icon: Icons.compare },
    { to: '/settings', label: t('settings.title'), icon: Icons.settings },
    { to: '/about', label: t('settings.about'), icon: Icons.about },
  ]

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={t('nav.menu')}
      >
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M4 15l1.5-4.5A2 2 0 017.4 9h9.2a2 2 0 011.9 1.5L20 15M4 15h16M4 15v2.5M20 15v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="7.5" cy="15" r="1.6" fill="currentColor" />
              <circle cx="16.5" cy="15" r="1.6" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.brandText}>
            <span className={styles.appName}>
              Bahon<span className={styles.appNameBn}>বাহন</span>
            </span>
            <span className={styles.tagline}>{t('app.tagline')}</span>
          </span>
        </div>

        <button
          type="button"
          className={styles.account}
          onClick={() => go(signedIn ? '/account' : '/auth')}
        >
          <span className={styles.accountAvatar} aria-hidden="true">{Icons.account}</span>
          <span className={styles.accountText}>
            <span className={styles.accountLabel}>
              {signedIn ? authUser.email : t('auth.sign_in')}
            </span>
            <span className={styles.accountSub}>
              {signedIn
                ? (entitlements?.pro ? t('account.pro') : t('account.free'))
                : t('account.title')}
            </span>
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <nav className={styles.menu}>
          {items.map((it) => {
            const active = it.to === '/' ? pathname === '/' : pathname.startsWith(it.to)
            return (
              <button
                key={it.to}
                type="button"
                className={`${styles.item} ${active ? styles.itemActive : ''}`}
                onClick={() => go(it.to)}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.itemIcon}>{it.icon}</span>
                <span className={styles.itemLabel}>{it.label}</span>
              </button>
            )
          })}
        </nav>

        <div className={styles.footer}>
          <span>Bahon · v{APP_VERSION}</span>
          <span>{t('about.privacy_note')}</span>
        </div>
      </aside>
    </>
  )
}
