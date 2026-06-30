import { useState, useEffect } from 'react'
import styles from './InstallBanner.module.css'

type Platform = 'android' | 'ios' | null

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return null
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)

  useEffect(() => {
    if (isStandalone()) return

    const p = detectPlatform()
    setPlatform(p)

    const dismissed = sessionStorage.getItem('install-banner-dismissed')
    if (dismissed) return

    if (p === 'android') {
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    if (p === 'ios') {
      setShow(true)
    }
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      (deferredPrompt as Event & { prompt: () => void }).prompt()
      setShow(false)
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('install-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className={styles.banner} role="banner" aria-label="Install app">
      <div className={styles.icon} aria-hidden="true">🚗</div>
      <div className={styles.text}>
        <span className={styles.title}>Install Bahon</span>
        {platform === 'ios' ? (
          <span className={styles.hint}>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>
        ) : (
          <span className={styles.hint}>Add to your home screen for the best experience</span>
        )}
      </div>
      <div className={styles.actions}>
        {platform === 'android' && deferredPrompt && (
          <button type="button" className={styles.installBtn} onClick={handleInstall}>
            Install
          </button>
        )}
        <button type="button" className={styles.dismissBtn} onClick={handleDismiss} aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
