import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Button } from '@components/primitives/Button'
import { Input } from '@components/primitives/Input'
import { useTranslation } from '@hooks/useTranslation'
import { useAuthStore } from '@store/authStore'
import { apiFetch } from '@api/client'
import styles from './AccountScreen.module.css'

export function AccountScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const entitlements = useAuthStore((s) => s.entitlements)
  const logout = useAuthStore((s) => s.logout)
  const resendVerification = useAuthStore((s) => s.resendVerification)
  const forgotPassword = useAuthStore((s) => s.forgotPassword)

  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Change-email inline form.
  const [emailOpen, setEmailOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'saving' | 'sent' | 'error'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  // Change-password (reset-link) flow.
  const [pwState, setPwState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

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

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !password) return
    setEmailState('saving')
    setEmailError(null)
    try {
      const res = await apiFetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim(), password }),
      })
      if (!res.ok) throw new Error('change_email_failed')
      setEmailState('sent')
      setPassword('')
    } catch {
      setEmailState('error')
      setEmailError(t('account.generic_error'))
    }
  }

  const handleChangePassword = async () => {
    if (pwState === 'sending' || pwState === 'sent') return
    setPwState('sending')
    try {
      await forgotPassword(user.email)
      setPwState('sent')
    } catch {
      setPwState('error')
    }
  }

  const chevron = (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div className={styles.root}>
      <TopBar title={t('account.title')} />
      <Screen>
        {/* Profile */}
        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true">
            {(user.displayName || user.email).charAt(0).toUpperCase()}
          </div>
          <div className={styles.identity}>
            {user.displayName && <span className={styles.name}>{user.displayName}</span>}
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

        {/* Security */}
        <p className={styles.sectionLabel}>{t('account.security')}</p>
        <div className={styles.section}>
          <button
            type="button"
            className={styles.actionRow}
            onClick={() => setEmailOpen((o) => !o)}
            aria-expanded={emailOpen}
          >
            <span className={styles.actionText}>
              <span className={styles.actionTitle}>{t('account.change_email')}</span>
              <span className={styles.actionDesc}>{t('account.change_email_desc')}</span>
            </span>
            <span className={`${styles.chevron} ${emailOpen ? styles.chevronOpen : ''}`}>{chevron}</span>
          </button>

          {emailOpen && (
            <div className={styles.form}>
              {emailState === 'sent' ? (
                <p className={styles.successMsg}>{t('account.change_email_sent', { email: newEmail })}</p>
              ) : (
                <>
                  <Input
                    type="email"
                    label={t('account.new_email')}
                    value={newEmail}
                    onChange={setNewEmail}
                    placeholder="you@example.com"
                    id="account-new-email"
                  />
                  <Input
                    type="password"
                    label={t('account.current_password')}
                    value={password}
                    onChange={setPassword}
                    id="account-current-password"
                  />
                  {emailError && <p className={styles.errorMsg} role="alert">{emailError}</p>}
                  <div className={styles.formActions}>
                    <Button
                      variant="secondary"
                      onClick={() => { setEmailOpen(false); setEmailState('idle'); setEmailError(null) }}
                    >
                      {t('account.cancel')}
                    </Button>
                    <Button
                      onClick={() => void handleChangeEmail()}
                      loading={emailState === 'saving'}
                      disabled={!newEmail.trim() || !password}
                    >
                      {t('account.save')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.actionRow}
            onClick={() => void handleChangePassword()}
            disabled={pwState === 'sending' || pwState === 'sent'}
          >
            <span className={styles.actionText}>
              <span className={styles.actionTitle}>{t('account.change_password')}</span>
              <span className={pwState === 'sent' ? styles.actionSuccess : styles.actionDesc}>
                {pwState === 'sent'
                  ? t('account.change_password_sent', { email: user.email })
                  : pwState === 'error'
                    ? t('account.generic_error')
                    : t('account.change_password_desc')}
              </span>
            </span>
            {pwState !== 'sent' && <span className={styles.chevron}>{chevron}</span>}
          </button>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" fullWidth onClick={() => void logout()}>
            {t('account.logout')}
          </Button>
        </div>
      </Screen>
    </div>
  )
}
