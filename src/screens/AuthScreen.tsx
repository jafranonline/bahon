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
            type="password"
            label={t('auth.password')}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            hint={mode === 'register' ? t('auth.password_hint') : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
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
