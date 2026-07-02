import { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID } from '@utils/constants'
import { useTranslation } from '@hooks/useTranslation'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

interface GsiButtonConfig {
  type: 'standard'
  theme: 'outline' | 'filled_blue' | 'filled_black'
  size: 'large' | 'medium' | 'small'
  text: 'signin_with' | 'signup_with' | 'continue_with'
  width?: number
  locale?: string
}

interface GoogleId {
  initialize(config: {
    client_id: string
    callback: (response: { credential: string }) => void
  }): void
  renderButton(parent: HTMLElement, options: GsiButtonConfig): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let gsiLoading: Promise<void> | null = null

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!gsiLoading) {
    gsiLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GSI_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        gsiLoading = null
        reject(new Error('gsi_load_failed'))
      }
      document.head.appendChild(script)
    })
  }
  return gsiLoading
}

interface GoogleSignInButtonProps {
  /** Called with the Google ID token when the user completes sign-in. */
  onCredential: (credential: string) => void
}

/**
 * Renders the official Google Identity Services button. One button covers
 * both sign-in and account creation — the server decides which applies.
 * Renders nothing while GOOGLE_CLIENT_ID is unset or the script is blocked.
 */
export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { i18n } = useTranslation()
  const language = i18n.language

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false
    loadGsi()
      .then(() => {
        const id = window.google?.accounts.id
        const parent = containerRef.current
        if (cancelled || !id || !parent) return
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res) => onCredential(res.credential),
        })
        parent.innerHTML = ''
        id.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: Math.min(parent.clientWidth || 320, 400),
          locale: language === 'bn' ? 'bn' : 'en',
        })
      })
      .catch(() => {
        /* offline or blocked — email/password login still works */
      })
    return () => {
      cancelled = true
    }
    // onCredential is stable enough for this screen; re-render on language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  if (!GOOGLE_CLIENT_ID) return null
  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
}
