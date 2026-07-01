import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Button } from '@components/primitives/Button'
import { useTranslation } from '@hooks/useTranslation'
import { useAuthStore } from '@store/authStore'
import styles from './VerifyEmailScreen.module.css'

type Status = 'verifying' | 'success' | 'error' | 'missing'

export function VerifyEmailScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const verifyEmail = useAuthStore((s) => s.verifyEmail)
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing')
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true // guard React 18 StrictMode double-invoke (token is single-use)
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token, verifyEmail])

  const icon = status === 'success' ? '✅' : status === 'verifying' ? '⏳' : '⚠️'
  const title =
    status === 'success' ? t('verify.success_title')
    : status === 'verifying' ? t('verify.verifying_title')
    : status === 'missing' ? t('verify.missing_title')
    : t('verify.error_title')
  const text =
    status === 'success' ? t('verify.success_text')
    : status === 'verifying' ? t('verify.verifying_text')
    : status === 'missing' ? t('verify.missing_text')
    : t('verify.error_text')

  return (
    <div className={styles.root}>
      <TopBar title={t('verify.title')} onBack={() => navigate('/', { replace: true })} showMenu={false} />
      <Screen>
        <div className={styles.center}>
          <span className={styles.icon} aria-hidden="true">{icon}</span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.text}>{text}</p>
          {status !== 'verifying' && (
            <Button onClick={() => navigate('/account', { replace: true })} fullWidth>
              {t('verify.go_account')}
            </Button>
          )}
        </div>
      </Screen>
    </div>
  )
}
