import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Select } from '@components/primitives/Select'
import { SegmentedControl } from '@components/primitives/SegmentedControl'
import { Toggle } from '@components/primitives/Toggle'
import { useSettingsStore } from '@store/settingsStore'
import { useAuthStore } from '@store/authStore'
import { useSyncStore } from '@store/syncStore'
import { syncNow } from '@/sync/syncEngine'
import { useExport } from '@hooks/useExport'
import { useTranslation } from '@hooks/useTranslation'
import { APP_VERSION } from '@utils/constants'
import i18n from '@i18n/config'
import type { Language, Currency, DistanceUnit, VolumeUnit, EfficiencyUnit, Theme } from '@/types'
import styles from './SettingsScreen.module.css'

type SettingsTab = 'general' | 'units' | 'data'

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
  const [tab, setTab] = useState<SettingsTab>('general')
  const authStatus = useAuthStore((s) => s.status)
  const authUser = useAuthStore((s) => s.user)
  const entitlements = useAuthStore((s) => s.entitlements)
  const signedIn = authStatus === 'authenticated' && authUser != null
  const isPro = entitlements?.pro ?? false
  const syncStatus = useSyncStore((s) => s.status)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const theme = useSettingsStore((s) => s.theme)
  const language = useSettingsStore((s) => s.language)
  const currency = useSettingsStore((s) => s.currency)
  const distanceUnit = useSettingsStore((s) => s.distanceUnit)
  const volumeUnit = useSettingsStore((s) => s.volumeUnit)
  const efficiencyUnit = useSettingsStore((s) => s.efficiencyUnit)
  const showAgentButton = useSettingsStore((s) => s.showAgentButton ?? true)
  const update = useSettingsStore((s) => s.update)

  const { exportAsCSV, exportAsJSON, importFromJSON } = useExport()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const TAB_OPTIONS: { value: SettingsTab; label: string }[] = [
    { value: 'general', label: t('settings.tab_general') },
    { value: 'units', label: t('settings.tab_units') },
    { value: 'data', label: t('settings.tab_data') },
  ]

  const THEME_OPTIONS: { value: Theme; label: string }[] = [
    { value: 'light', label: t('settings.themes.light') },
    { value: 'dark', label: t('settings.themes.dark') },
    { value: 'system', label: t('settings.themes.system') },
  ]

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

      <div className={styles.tabBar}>
        <SegmentedControl
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
          aria-label={t('settings.title')}
        />
      </div>

      <Screen padding="0" gap="0">

        {tab === 'general' && (
          <>
            <p className={styles.sectionLabel}>{t('settings.section_display')}</p>
            <div className={styles.section}>
              <div className={styles.tabRow}>
                <span className={styles.rowLabel}>{t('settings.theme')}</span>
                <SegmentedControl
                  options={THEME_OPTIONS}
                  value={theme}
                  onChange={(v) => update({ theme: v })}
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
                    placeholder={t('settings.language')}
                    aria-label={t('settings.language')}
                  />
                </div>
              </div>
            </div>

            {isPro && (
              <>
                <p className={styles.sectionLabel}>{t('agent.title')}</p>
                <div className={styles.section}>
                  <div className={styles.tabRow}>
                    <span className={styles.rowLabel}>{t('settings.show_agent_button')}</span>
                    <Toggle
                      checked={showAgentButton}
                      onChange={(v) => update({ showAgentButton: v })}
                      aria-label={t('settings.show_agent_button')}
                    />
                  </div>
                </div>
              </>
            )}

            <p className={styles.sectionLabel}>{t('settings.section_app')}</p>
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
          </>
        )}

        {tab === 'units' && (
          <>
            <p className={styles.sectionLabel}>{t('settings.section_units')}</p>
            <div className={styles.section}>
              <div className={styles.selectRow}>
                <span className={styles.rowLabel}>{t('settings.currency')}</span>
                <div className={styles.selectWrap}>
                  <Select
                    options={CURRENCIES}
                    value={currency}
                    onChange={(v) => update({ currency: v })}
                    placeholder={t('settings.currency')}
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
                  onChange={(v) => update({ distanceUnit: v })}
                  aria-label={t('settings.distance_unit')}
                />
              </div>
              <div className={styles.divider} />
              <div className={styles.tabRow}>
                <span className={styles.rowLabel}>{t('settings.volume_unit')}</span>
                <SegmentedControl
                  options={VOLUME_OPTIONS}
                  value={volumeUnit}
                  onChange={(v) => update({ volumeUnit: v })}
                  aria-label={t('settings.volume_unit')}
                />
              </div>
              <div className={styles.divider} />
              <div className={styles.tabRow}>
                <span className={styles.rowLabel}>{t('settings.efficiency_unit')}</span>
                <SegmentedControl
                  options={EFFICIENCY_OPTIONS}
                  value={efficiencyUnit}
                  onChange={(v) => update({ efficiencyUnit: v })}
                  aria-label={t('settings.efficiency_unit')}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'data' && (
          <>
            {signedIn && isPro && (
              <>
                <p className={styles.sectionLabel}>{t('sync.title')}</p>
                <div className={styles.section}>
                  <button
                    type="button"
                    className={styles.row}
                    onClick={() => void syncNow()}
                    disabled={syncStatus === 'syncing'}
                  >
                    <span className={styles.rowLabel}>
                      {syncStatus === 'syncing' ? t('sync.syncing') : t('sync.sync_now')}
                    </span>
                    <span className={styles.rowValue}>
                      {syncStatus === 'error'
                        ? t('sync.error')
                        : lastSyncedAt
                          ? new Date(lastSyncedAt).toLocaleString()
                          : t('sync.never')}
                    </span>
                  </button>
                </div>
              </>
            )}

            <p className={styles.sectionLabel}>{t('settings.section_backup')}</p>
            <div className={styles.section}>
              <button
                type="button"
                className={styles.row}
                onClick={() => void handleExport()}
              >
                <span className={styles.rowLabel}>{t('settings.export_csv')}</span>
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
          </>
        )}

        <p className={styles.version}>Bahon · v{APP_VERSION}</p>

      </Screen>
    </div>
  )
}
