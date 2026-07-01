import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Select } from '@components/primitives/Select'
import { SegmentedControl } from '@components/primitives/SegmentedControl'
import { useSettingsStore } from '@store/settingsStore'
import { useAuthStore } from '@store/authStore'
import { useExport } from '@hooks/useExport'
import { useTranslation } from '@hooks/useTranslation'
import { APP_VERSION } from '@utils/constants'
import i18n from '@i18n/config'
import type { Language, Currency, DistanceUnit, VolumeUnit, EfficiencyUnit, Theme } from '@/types'
import styles from './SettingsScreen.module.css'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা' },
]

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'BDT', label: 'BDT — ৳ Taka' },
  { value: 'USD', label: 'USD — $ Dollar' },
  { value: 'INR', label: 'INR — ₹ Rupee' },
]

const DISTANCE_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'km' },
  { value: 'mi', label: 'mi' },
]

const VOLUME_OPTIONS: { value: VolumeUnit; label: string }[] = [
  { value: 'L', label: 'L' },
  { value: 'gal', label: 'gal' },
]

const EFFICIENCY_OPTIONS: { value: EfficiencyUnit; label: string }[] = [
  { value: 'km/L', label: 'km/L' },
  { value: 'L/100km', label: 'L/100km' },
  { value: 'MPG', label: 'MPG' },
]

export function SettingsScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const authStatus = useAuthStore((s) => s.status)
  const authUser = useAuthStore((s) => s.user)
  const entitlements = useAuthStore((s) => s.entitlements)
  const signedIn = authStatus === 'authenticated' && authUser != null
  const theme = useSettingsStore((s) => s.theme)
  const language = useSettingsStore((s) => s.language)
  const currency = useSettingsStore((s) => s.currency)
  const distanceUnit = useSettingsStore((s) => s.distanceUnit)
  const volumeUnit = useSettingsStore((s) => s.volumeUnit)
  const efficiencyUnit = useSettingsStore((s) => s.efficiencyUnit)
  const update = useSettingsStore((s) => s.update)

  const { exportAsCSV, exportAsJSON, importFromJSON } = useExport()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function setLanguage(lang: Language) {
    update({ language: lang })
    void i18n.changeLanguage(lang)
  }

  async function handleExport() {
    await exportAsCSV('fuel')
    await exportAsCSV('service')
    await exportAsCSV('expenses')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      await importFromJSON(file)
      alert(t('settings.import_success'))
      window.location.reload()
    } catch {
      alert(t('settings.import_error'))
    }
  }

  return (
    <div className={styles.root}>
      <TopBar title={t('settings.title')} onBack={() => navigate(-1)} />
      <Screen padding="0" gap="0">

        <p className={styles.sectionLabel}>{t('account.title')}</p>
        <div className={styles.section}>
          <button
            type="button"
            className={styles.row}
            onClick={() => navigate(signedIn ? '/account' : '/auth')}
          >
            <span className={styles.rowLabel}>
              {signedIn ? authUser.email : t('auth.sign_in')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {signedIn && (
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {entitlements?.pro ? t('account.pro') : t('account.free')}
                </span>
              )}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </div>

        <p className={styles.sectionLabel}>Display</p>
        <div className={styles.section}>
          <div className={styles.tabRow}>
            <span className={styles.rowLabel}>{t('settings.theme')}</span>
            <SegmentedControl
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => update({ theme: v as Theme })}
              aria-label={t('settings.theme')}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.selectRow}>
            <span className={styles.rowLabel}>{t('settings.language')}</span>
            <div className={styles.selectWrap}>
              <Select
                options={LANGUAGES}
                value={language}
                onChange={(v) => setLanguage(v as Language)}
                placeholder="Select language"
                aria-label={t('settings.language')}
              />
            </div>
          </div>
        </div>

        <p className={styles.sectionLabel}>Units</p>
        <div className={styles.section}>
          <div className={styles.selectRow}>
            <span className={styles.rowLabel}>{t('settings.currency')}</span>
            <div className={styles.selectWrap}>
              <Select
                options={CURRENCIES}
                value={currency}
                onChange={(v) => update({ currency: v })}
                placeholder="Select currency"
                aria-label={t('settings.currency')}
              />
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.tabRow}>
            <span className={styles.rowLabel}>{t('settings.distance_unit')}</span>
            <SegmentedControl
              options={DISTANCE_OPTIONS}
              value={distanceUnit}
              onChange={(v) => update({ distanceUnit: v as DistanceUnit })}
              aria-label={t('settings.distance_unit')}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.tabRow}>
            <span className={styles.rowLabel}>{t('settings.volume_unit')}</span>
            <SegmentedControl
              options={VOLUME_OPTIONS}
              value={volumeUnit}
              onChange={(v) => update({ volumeUnit: v as VolumeUnit })}
              aria-label={t('settings.volume_unit')}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.tabRow}>
            <span className={styles.rowLabel}>{t('settings.efficiency_unit')}</span>
            <SegmentedControl
              options={EFFICIENCY_OPTIONS}
              value={efficiencyUnit}
              onChange={(v) => update({ efficiencyUnit: v as EfficiencyUnit })}
              aria-label={t('settings.efficiency_unit')}
            />
          </div>
        </div>

        <p className={styles.sectionLabel}>Data</p>
        <div className={styles.section}>
          <button
            type="button"
            className={styles.row}
            onClick={() => void handleExport()}
          >
            <span className={styles.rowLabel}>{t('common.export')} (CSV)</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 3v9M5 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 14h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.row}
            onClick={() => void exportAsJSON()}
          >
            <span className={styles.rowLabel}>{t('settings.export_json')}</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 3v9M5 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 14h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <div className={styles.divider} />
          <button
            type="button"
            className={styles.row}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={styles.rowLabel}>{t('settings.import_json')}</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 15V6M5 10l4-4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 14h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            aria-label={t('settings.import_json')}
            style={{ display: 'none' }}
            onChange={(e) => void handleImportFile(e)}
          />
        </div>

        <p className={styles.sectionLabel}>App</p>
        <div className={styles.section}>
          <button
            type="button"
            className={styles.row}
            onClick={() => navigate('/about')}
          >
            <span className={styles.rowLabel}>{t('settings.about')}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className={styles.version}>Bahon · v{APP_VERSION}</p>

      </Screen>
    </div>
  )
}
