import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { useTranslation } from '@hooks/useTranslation'
import { FEEDBACK_FORM_URL, APP_VERSION } from '@utils/constants'
import styles from './AboutScreen.module.css'

export function AboutScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  function handleFeedback() {
    if (FEEDBACK_FORM_URL) {
      window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={t('about.title')} onBack={() => navigate(-1)} />
      <Screen>
        <div className={styles.content}>
          <div className={styles.hero}>
            <span className={styles.appName}>Bahon</span>
            <span className={styles.tagline}>Your vehicles, tracked.</span>
          </div>

          <p className={styles.description}>{t('about.description')}</p>

          <div className={styles.section}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('about.built_by')}</span>
              <span className={styles.rowValue}>Jafran</span>
            </div>
            <div className={styles.row}>
              <a
                href={`mailto:${t('about.contact')}`}
                className={styles.emailLink}
                aria-label="Send email to Jafran"
              >
                {t('about.contact')}
              </a>
            </div>
          </div>

          <button
            type="button"
            className={styles.feedbackBtn}
            onClick={FEEDBACK_FORM_URL ? handleFeedback : undefined}
            aria-label={t('about.send_feedback')}
          >
            {FEEDBACK_FORM_URL ? t('about.send_feedback') : 'Coming soon'}
          </button>

          <p className={styles.privacyNote}>{t('about.privacy_note')}</p>

          <p className={styles.privacyNote}>{t('about.open_source')}</p>

          <p className={styles.version}>{t('about.version')} {APP_VERSION}</p>
        </div>
      </Screen>
    </div>
  )
}
