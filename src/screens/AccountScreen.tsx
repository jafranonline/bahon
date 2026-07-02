import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Button } from '@components/primitives/Button'
import { useTranslation } from '@hooks/useTranslation'
import { useAuthStore } from '@store/authStore'
import styles from './AccountScreen.module.css'

export function AccountScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const entitlements = useAuthStore((s) => s.entitlements)
  const logout = useAuthStore((s) => s.logout)
  const resendVerification = useAuthStore((s) => s.resendVerification)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Not signed in → go to the auth screen.
  useEffect(() => {
    if (status === 'anonymous') navigate('/auth', { replace: true })
  }, [status, navigate])

  if (!user) return null

  const pro = entitlements?.pro ?? false
  const expiresAt = entitlements?.expiresAt

  const handleResend = async () => {
    setResendState('sending')
    try {
      await resendVerification()
      setResendState('sent')
    } catch {
      setResendState('error')
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={t('account.title')} />
      <Screen>
        <div className={styles.card}>
          <div className={styles.avatar} aria-hidden="true">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className={styles.identity}>
            <span className={styles.email}>{user.email}</span>
            <span className={`${styles.badge} ${pro ? styles.badgePro : styles.badgeFree}`}>
              {pro ? t('account.pro') : t('account.free')}
            </span>
          </div>
        </div>

        {!user.emailVerified && (
          <div className={styles.verifyBox}>
            <p className={styles.verifyTitle}>{t('account.verify_title')}</p>
            <p className={styles.verifyText}>
              {resendState === 'sent'
                ? t('account.verify_sent')
                : t('account.verify_text', { email: user.email })}
            </p>
            {resendState !== 'sent' && (
              <button
                type="button"
                className={styles.verifyBtn}
                onClick={() => void handleResend()}
                disabled={resendState === 'sending'}
              >
                {resendState === 'sending' ? t('account.verify_sending') : t('account.verify_resend')}
              </button>
            )}
            {resendState === 'error' && (
              <p className={styles.verifyError} role="alert">{t('account.verify_error')}</p>
            )}
          </div>
        )}

        {pro ? (
          <div className={styles.infoBox}>
            <p className={styles.infoTitle}>{t('account.pro_active')}</p>
            <p className={styles.infoText}>
              {expiresAt
                ? t('account.expires_on', { date: new Date(expiresAt).toLocaleDateString() })
                : t('account.pro_lifetime')}
            </p>
          </div>
        ) : (
          <div className={styles.upgradeBox}>
            <p className={styles.upgradeTitle}>{t('account.upgrade_title')}</p>
            <p className={styles.upgradeText}>{t('account.upgrade_text')}</p>
            <a className={styles.upgradeLink} href="mailto:mail@jafran.online?subject=Bahon%20Pro">
              {t('account.upgrade_cta')}
            </a>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" fullWidth onClick={() => void logout()}>
            {t('account.logout')}
          </Button>
        </div>
      </Screen>
    </div>
  )
}
