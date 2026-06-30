import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Toggle } from '@components/primitives/Toggle'
import { Select } from '@components/primitives/Select'
import { useSettingsStore } from '@store/settingsStore'
import { useExport } from '@hooks/useExport'
import { useTranslation } from '@hooks/useTranslation'
import { APP_VERSION } from '@utils/constants'
import i18n from '@i18n/config'
import type { Language, Currency, DistanceUnit, VolumeUnit, EfficiencyUnit } from '@/types'
import styles from './SettingsScreen.module.css'

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা' },
]

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'BDT', label: 'BDT — ৳ Taka' },
  { value: 'USD', label: 'USD — $ Dollar' },
  { value: 'INR', label: 'INR — ₹ Rupee' },
]

const DISTANCE_UNITS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'Kilometres (km)' },
  { value: 'mi', label: 'Miles (mi)' },
]

const VOLUME_UNITS: { value: VolumeUnit; label: string }[] = [
  { value: 'L', label: 'Litres (L)' },
  { value: 'gal', label: 'Gallons (gal)' },
]

const EFFICIENCY_UNITS: { value: EfficiencyUnit; label: string }[] = [
  { value: 'km/L', label: 'km/L' },
  { value: 'L/100km', label: 'L/100km' },
  { value: 'MPG', label: 'MPG' },
]

export function SettingsScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const theme = useSettingsStore((s) => s.theme)
  const language = useSettingsStore((s) => s.language)
  const currency = useSettingsStore((s) => s.currency)
  const distanceUnit = useSettingsStore((s) => s.distanceUnit)
  const volumeUnit = useSettingsStore((s) => s.volumeUnit)
  const efficiencyUnit = useSettingsStore((s) => s.efficiencyUnit)
  const update = useSettingsStore((s) => s.update)

  const { exportAsCSV } = useExport()

  function setTheme(dark: boolean) {
    update({ theme: dark ? 'dark' : 'light' })
  }

  function setLanguage(lang: Language) {
    update({ language: lang })
    void i18n.changeLanguage(lang)
  }

  async function handleExport() {
    await exportAsCSV('fuel')
    await exportAsCSV('service')
    await exportAsCSV('expenses')
  }

  return (
    <div className={styles.root}>
      <TopBar title={t('settings.title')} onBack={() => navigate(-1)} />
      <Screen padding="0" gap="0">

        <p className={styles.sectionLabel}>Display</p>
        <div className={styles.section}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>{t('settings.theme')}</span>
            <Toggle
              checked={theme === 'dark'}
              onChange={setTheme}
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
          <div className={styles.selectRow}>
            <span className={styles.rowLabel}>{t('settings.distance_unit')}</span>
            <div className={styles.selectWrap}>
              <Select
                options={DISTANCE_UNITS}
                value={distanceUnit}
                onChange={(v) => update({ distanceUnit: v })}
                placeholder="Distance unit"
                aria-label={t('settings.distance_unit')}
              />
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.selectRow}>
            <span className={styles.rowLabel}>{t('settings.volume_unit')}</span>
            <div className={styles.selectWrap}>
              <Select
                options={VOLUME_UNITS}
                value={volumeUnit}
                onChange={(v) => update({ volumeUnit: v })}
                placeholder="Volume unit"
                aria-label={t('settings.volume_unit')}
              />
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.selectRow}>
            <span className={styles.rowLabel}>{t('settings.efficiency_unit')}</span>
            <div className={styles.selectWrap}>
              <Select
                options={EFFICIENCY_UNITS}
                value={efficiencyUnit}
                onChange={(v) => update({ efficiencyUnit: v })}
                placeholder="Efficiency unit"
                aria-label={t('settings.efficiency_unit')}
              />
            </div>
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
