import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { useTranslation } from '@hooks/useTranslation'
import { useShare } from '@hooks/useShare'
import { FEEDBACK_FORM_URL, APP_VERSION } from '@utils/constants'
import styles from './AboutScreen.module.css'

const DEVELOPER = {
  name: 'Jafran Hasan',
  email: 'mail@jafran.online',
  website: 'https://jafran.online',
  handle: '@jafranonline',
}

export function AboutScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { share, copied } = useShare()

  return (
    <div className={styles.root}>
      <TopBar title={t('about.title')} onBack={() => navigate(-1)} />
      <Screen>
        <div className={styles.content}>

          <div className={styles.hero}>
            <span className={styles.appIcon} aria-hidden="true">🚗</span>
            <span className={styles.appName}>Bahon</span>
            <span className={styles.tagline}>Your vehicles, tracked.</span>
          </div>

          <p className={styles.description}>{t('about.description')}</p>

          {/* Developer card */}
          <div className={styles.devCard}>
            <div className={styles.devAvatar} aria-hidden="true">JH</div>
            <div className={styles.devInfo}>
              <span className={styles.devName}>{DEVELOPER.name}</span>
              <span className={styles.devHandle}>{DEVELOPER.handle}</span>
            </div>
          </div>

          <div className={styles.linksCard}>
            <a
              href={DEVELOPER.website}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkRow}
              aria-label="Developer website"
            >
              <span className={styles.linkIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 1.5C6.5 3.5 5.5 5.5 5.5 8s1 4.5 2.5 6.5M8 1.5C9.5 3.5 10.5 5.5 10.5 8S9.5 12.5 8 14.5M1.5 8h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </span>
              <span className={styles.linkLabel}>jafran.online</span>
              <svg className={styles.linkChevron} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            <div className={styles.linkDivider} />

            <a
              href={`mailto:${DEVELOPER.email}`}
              className={styles.linkRow}
              aria-label="Send email"
            >
              <span className={styles.linkIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M1.5 5l6.5 4.5L14.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </span>
              <span className={styles.linkLabel}>{DEVELOPER.email}</span>
              <svg className={styles.linkChevron} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <button
            type="button"
            className={styles.shareBtn}
            onClick={() => void share()}
            aria-label={t('settings.share_app')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="14" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="14" cy="15" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="4" cy="9" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5.5 8.1L12.5 4M5.5 9.9L12.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {copied ? t('common.link_copied') : t('settings.share_app')}
          </button>

          {FEEDBACK_FORM_URL && (
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.feedbackBtn}
              aria-label={t('about.send_feedback')}
            >
              {t('about.send_feedback')}
            </a>
          )}

          <p className={styles.privacyNote}>{t('about.privacy_note')}</p>

          <p className={styles.version}>v{APP_VERSION}</p>
        </div>
      </Screen>
    </div>
  )
}
