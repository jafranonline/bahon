import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toggle } from '@components/primitives/Toggle'
import { useSettingsStore } from '@store/settingsStore'
import { useVehicleStore } from '@store/vehicleStore'
import { useUIStore } from '@store/uiStore'
import { useVehicle } from '@db/queries/useVehicles'
import { useExport } from '@hooks/useExport'
import { useTranslation } from '@hooks/useTranslation'
import i18n from '@i18n/config'
import type {
  Language,
  Currency,
  DistanceUnit,
  VolumeUnit,
  EfficiencyUnit,
} from '@/types'
import styles from './SettingsDrawer.module.css'

type ExpandSection = 'language' | 'distance' | 'volume' | 'efficiency' | 'currency' | null

function Row({
  label,
  trailing,
  onClick,
  children,
}: {
  label: string
  trailing?: React.ReactNode
  onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className={styles.rowWrap}>
      <button
        type="button"
        className={styles.row}
        onClick={onClick}
        aria-label={label}
        disabled={!onClick}
      >
        <span className={styles.rowLabel}>{label}</span>
        {trailing && <span className={styles.rowTrailing}>{trailing}</span>}
      </button>
      {children && <div className={styles.expandContent}>{children}</div>}
    </div>
  )
}

function OptionList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className={styles.optionList}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={[styles.option, value === opt.value ? styles.optionSelected : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          <span>{opt.label}</span>
          {value === opt.value && <span className={styles.check} aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
  )
}

export function SettingsDrawer() {
  const [expanded, setExpanded] = useState<ExpandSection>(null)
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setDrawerOpen = useUIStore(s => s.setDrawerOpen)

  const theme = useSettingsStore(s => s.theme)
  const language = useSettingsStore(s => s.language)
  const currency = useSettingsStore(s => s.currency)
  const distanceUnit = useSettingsStore(s => s.distanceUnit)
  const volumeUnit = useSettingsStore(s => s.volumeUnit)
  const efficiencyUnit = useSettingsStore(s => s.efficiencyUnit)
  const update = useSettingsStore(s => s.update)

  const activeVehicleId = useVehicleStore(s => s.activeVehicleId)
  const vehicle = useVehicle(activeVehicleId ?? '')

  const { exportAsCSV } = useExport()

  function toggleSection(section: ExpandSection) {
    setExpanded(prev => prev === section ? null : section)
  }

  function setTheme(dark: boolean) {
    update({ theme: dark ? 'dark' : 'light' })
  }

  function setLanguage(lang: Language) {
    update({ language: lang })
    void i18n.changeLanguage(lang)
    setExpanded(null)
  }

  async function handleExport() {
    await exportAsCSV('fuel')
    await exportAsCSV('service')
    await exportAsCSV('expenses')
  }

  const isDark = theme === 'dark'

  const CURRENCIES: { value: Currency; label: string }[] = [
    { value: 'BDT', label: 'BDT — ৳ Taka' },
    { value: 'USD', label: 'USD — $ Dollar' },
    { value: 'EUR', label: 'EUR — € Euro' },
    { value: 'INR', label: 'INR — ₹ Rupee' },
    { value: 'GBP', label: 'GBP — £ Pound' },
    { value: 'SAR', label: 'SAR — ر.س Riyal' },
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

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.appName}>Bahon</p>
        {vehicle && <p className={styles.vehicleName}>{vehicle.name}</p>}
      </div>

      <div className={styles.section}>
        {/* Dark mode */}
        <Row
          label={t('settings.theme')}
          trailing={
            <Toggle
              checked={isDark}
              onChange={setTheme}
              aria-label={t('settings.theme')}
            />
          }
        />

        {/* Language */}
        <Row
          label={t('settings.language')}
          trailing={<span className={styles.currentVal}>{language === 'en' ? t('settings.languages.en') : t('settings.languages.bn')} ›</span>}
          onClick={() => toggleSection('language')}
        >
          {expanded === 'language' && (
            <OptionList
              options={[
                { value: 'en', label: t('settings.languages.en') },
                { value: 'bn', label: t('settings.languages.bn') },
              ]}
              value={language}
              onChange={(v) => setLanguage(v as Language)}
            />
          )}
        </Row>

        {/* Currency */}
        <Row
          label={t('settings.currency')}
          trailing={<span className={styles.currentVal}>{currency} ›</span>}
          onClick={() => toggleSection('currency')}
        >
          {expanded === 'currency' && (
            <OptionList
              options={CURRENCIES}
              value={currency}
              onChange={(v) => { update({ currency: v }); setExpanded(null) }}
            />
          )}
        </Row>

        {/* Distance unit */}
        <Row
          label={t('settings.distance_unit')}
          trailing={<span className={styles.currentVal}>{distanceUnit} ›</span>}
          onClick={() => toggleSection('distance')}
        >
          {expanded === 'distance' && (
            <OptionList
              options={DISTANCE_UNITS}
              value={distanceUnit}
              onChange={(v) => { update({ distanceUnit: v }); setExpanded(null) }}
            />
          )}
        </Row>

        {/* Volume unit */}
        <Row
          label={t('settings.volume_unit')}
          trailing={<span className={styles.currentVal}>{volumeUnit} ›</span>}
          onClick={() => toggleSection('volume')}
        >
          {expanded === 'volume' && (
            <OptionList
              options={VOLUME_UNITS}
              value={volumeUnit}
              onChange={(v) => { update({ volumeUnit: v }); setExpanded(null) }}
            />
          )}
        </Row>

        {/* Efficiency unit */}
        <Row
          label={t('settings.efficiency_unit')}
          trailing={<span className={styles.currentVal}>{efficiencyUnit} ›</span>}
          onClick={() => toggleSection('efficiency')}
        >
          {expanded === 'efficiency' && (
            <OptionList
              options={EFFICIENCY_UNITS}
              value={efficiencyUnit}
              onChange={(v) => { update({ efficiencyUnit: v }); setExpanded(null) }}
            />
          )}
        </Row>
      </div>

      <div className={styles.section}>
        {/* Export */}
        <Row
          label={t('common.export')}
          trailing={<span className={styles.currentVal}>CSV ›</span>}
          onClick={handleExport}
        />

        {/* Storage info */}
        <Row label="Storage" trailing={<span className={styles.currentVal}>On device</span>} />

        {/* About */}
        <Row
          label={t('settings.about')}
          trailing={<span className={styles.currentVal}>›</span>}
          onClick={() => { setDrawerOpen(false); navigate('/about') }}
        />
      </div>
    </div>
  )
}
