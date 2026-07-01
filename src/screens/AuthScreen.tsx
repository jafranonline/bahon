import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useTranslation } from '@hooks/useTranslation'
import { useAuthStore } from '@store/authStore'
import styles from './AuthScreen.module.css'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const forgotPassword = useAuthStore((s) => s.forgotPassword)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passwordToggle = (
    <button
      type="button"
      className={styles.eyeBtn}
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
      aria-pressed={showPassword}
      tabIndex={-1}
    >
      {showPassword ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4 10 7a12 12 0 01-2.2 3.2M6.2 6.2A12 12 0 002 12c1 3 5 7 10 7a9.6 9.6 0 003.7-.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )}
    </button>
  )

  const errorText = (code: string): string => {
    const map: Record<string, string> = {
      invalid_email: t('auth.err_invalid_email'),
      weak_password: t('auth.err_weak_password'),
      email_taken: t('auth.err_email_taken'),
      invalid_credentials: t('auth.err_invalid_credentials'),
    }
    return map[code] ?? t('auth.err_generic')
  }

  const submit = async () => {
    setError(null)
    if (!email.trim() || !password) {
      setError(t('auth.err_required'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') await register(email.trim(), password, name.trim() || undefined)
      else await login(email.trim(), password)
      navigate('/account', { replace: true })
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : 'auth.err_generic'))
    } finally {
      setBusy(false)
    }
  }

  const submitForgot = async () => {
    setError(null)
    if (!email.trim()) {
      setError(t('auth.err_required'))
      return
    }
    setBusy(true)
    try {
      await forgotPassword(email.trim())
      setForgotSent(true) // generic success — server never reveals if the account exists
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : 'auth.err_generic'))
    } finally {
      setBusy(false)
    }
  }

  const backToLogin = () => {
    setForgot(false)
    setForgotSent(false)
    setError(null)
  }

  if (forgot) {
    return (
      <div className={styles.root}>
        <TopBar title={t('auth.forgot_title')} onBack={backToLogin} />
        <Screen>
          {forgotSent ? (
            <div className={styles.form}>
              <p className={styles.intro}>{t('auth.forgot_sent', { email: email.trim() })}</p>
              <Button onClick={backToLogin} fullWidth>{t('auth.back_to_login')}</Button>
            </div>
          ) : (
            <div className={styles.form}>
              <p className={styles.intro}>{t('auth.forgot_intro')}</p>
              <Input
                type="email"
                label={t('auth.email')}
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {error && <p className={styles.error} role="alert">{error}</p>}
              <Button onClick={submitForgot} loading={busy} fullWidth>
                {t('auth.forgot_submit')}
              </Button>
            </div>
          )}
        </Screen>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <TopBar title={t('auth.title')} onBack={() => navigate(-1)} />
      <Screen>
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            {t('auth.login')}
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => { setMode('register'); setError(null) }}
          >
            {t('auth.register')}
          </button>
        </div>

        <p className={styles.intro}>{t('auth.intro')}</p>

        <div className={styles.form}>
          {mode === 'register' && (
            <Input
              label={t('auth.name')}
              value={name}
              onChange={setName}
              placeholder={t('auth.name_placeholder')}
              autoComplete="name"
            />
          )}
          <Input
            type="email"
            label={t('auth.email')}
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Input
            type={showPassword ? 'text' : 'password'}
            label={t('auth.password')}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            hint={mode === 'register' ? t('auth.password_hint') : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            suffix={passwordToggle}
          />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Button onClick={submit} loading={busy} fullWidth>
            {mode === 'register' ? t('auth.create_account') : t('auth.sign_in')}
          </Button>
          {mode === 'login' && (
            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => { setForgot(true); setError(null) }}
            >
              {t('auth.forgot_link')}
            </button>
          )}
        </div>
      </Screen>
    </div>
  )
}
