import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useTranslation } from '@hooks/useTranslation'
import { useAuthStore } from '@store/authStore'
import styles from './ResetPasswordScreen.module.css'

export function ResetPasswordScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const errorText = (code: string): string => {
    const map: Record<string, string> = {
      invalid_token: t('reset.err_invalid_token'),
      weak_password: t('auth.err_weak_password'),
    }
    return map[code] ?? t('auth.err_generic')
  }

  const submit = async () => {
    setError(null)
    if (password.length < 8) {
      setError(t('auth.err_weak_password'))
      return
    }
    if (password !== confirm) {
      setError(t('reset.err_mismatch'))
      return
    }
    setBusy(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : 'auth.err_generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={t('reset.title')} onBack={() => navigate('/auth', { replace: true })} showMenu={false} />
      <Screen>
        {!token ? (
          <p className={styles.intro}>{t('reset.missing_token')}</p>
        ) : done ? (
          <div className={styles.form}>
            <p className={styles.intro}>{t('reset.success')}</p>
            <Button onClick={() => navigate('/auth', { replace: true })} fullWidth>
              {t('auth.sign_in')}
            </Button>
          </div>
        ) : (
          <div className={styles.form}>
            <p className={styles.intro}>{t('reset.intro')}</p>
            <Input
              type="password"
              label={t('reset.new_password')}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              hint={t('auth.password_hint')}
              autoComplete="new-password"
            />
            <Input
              type="password"
              label={t('reset.confirm_password')}
              value={confirm}
              onChange={setConfirm}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <Button onClick={submit} loading={busy} fullWidth>
              {t('reset.submit')}
            </Button>
          </div>
        )}
      </Screen>
    </div>
  )
}
