import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip } from '@components/primitives/Chip'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useSettingsStore } from '@store/settingsStore'
import { useVehicleStore } from '@store/vehicleStore'
import { addVehicle } from '@db/queries/useVehicles'
import { useTranslation } from '@hooks/useTranslation'
import i18n from '@i18n/config'
import type { Language, VehicleType, FuelType } from '@/types'
import styles from './OnboardingScreen.module.css'

type TypeOption = { value: VehicleType; label: string; icon: string }
type FuelOption = { value: FuelType; label: string }

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
  { value: 'car',        label: 'Car / SUV',  icon: '🚗' },
  { value: 'truck',      label: 'Truck',       icon: '🚛' },
  { value: 'bus',        label: 'Bus / Other', icon: '🚌' },
]

const FUEL_OPTIONS: FuelOption[] = [
  { value: 'octane',   label: 'Octane'   },
  { value: 'petrol',   label: 'Petrol'   },
  { value: 'diesel',   label: 'Diesel'   },
  { value: 'cng',      label: 'CNG'      },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid',   label: 'Hybrid'   },
]

const LANG_OPTIONS: { value: Language; native: string; english: string; flag: string }[] = [
  { value: 'en', native: 'English',  english: 'English', flag: '🇬🇧' },
  { value: 'bn', native: 'বাংলা',   english: 'Bangla',  flag: '🇧🇩' },
]

export function OnboardingScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const updateSettings = useSettingsStore((s) => s.update)
  const currentLang = useSettingsStore((s) => s.language)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)

  const [step, setStep] = useState<1 | 2>(1)
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle')
  const [fuelType, setFuelType] = useState<FuelType>('octane')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)

  function selectLanguage(lang: Language) {
    updateSettings({ language: lang })
    void i18n.changeLanguage(lang)
  }

  async function handleGetStarted() {
    if (!name.trim()) {
      setNameError(t('common.required'))
      return
    }
    setNameError('')
    setSaving(true)
    try {
      const id = await addVehicle({
        name: name.trim(),
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        type: vehicleType,
        fuelType,
        odometer: 0,
      })
      setActiveVehicle(id)
      updateSettings({ onboardingComplete: true })
      navigate('/', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.dots}>
          <span className={`${styles.dot} ${step === 1 ? styles.dotActive : styles.dotDone}`} />
          <span className={`${styles.dot} ${step === 2 ? styles.dotActive : ''}`} />
        </div>
      </div>

      {step === 1 && (
        <div className={styles.content}>
          <div className={styles.hero}>
            <span className={styles.heroIcon}>🌐</span>
            <h1 className={styles.title}>{t('onboarding.step_language_title')}</h1>
            <p className={styles.sub}>{t('onboarding.step_language_sub')}</p>
          </div>

          <div className={styles.langGrid}>
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.langCard} ${currentLang === opt.value ? styles.langCardSelected : ''}`}
                onClick={() => selectLanguage(opt.value)}
                aria-pressed={currentLang === opt.value}
              >
                <span className={styles.langFlag}>{opt.flag}</span>
                <span className={styles.langNative}>{opt.native}</span>
                <span className={styles.langEnglish}>{opt.english}</span>
                {currentLang === opt.value && (
                  <span className={styles.langCheck} aria-hidden="true">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.footer}>
            <Button onClick={() => setStep(2)} fullWidth>
              {t('onboarding.continue')}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.content}>
          <div className={styles.hero}>
            <span className={styles.heroIcon}>🚘</span>
            <h1 className={styles.title}>{t('onboarding.step_vehicle_title')}</h1>
            <p className={styles.sub}>{t('onboarding.step_vehicle_sub')}</p>
          </div>

          <div className={styles.form}>
            <div>
              <p className={styles.fieldLabel}>{t('vehicle.type')}</p>
              <div className={styles.typeGrid}>
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.typeCard} ${vehicleType === opt.value ? styles.typeCardSelected : ''}`}
                    onClick={() => setVehicleType(opt.value)}
                    aria-pressed={vehicleType === opt.value}
                  >
                    <span className={styles.typeIcon} aria-hidden="true">{opt.icon}</span>
                    <span className={styles.typeLabel}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={t('vehicle.nickname')}
              value={name}
              onChange={(v) => { setName(v); setNameError('') }}
              placeholder={t('vehicle.nickname_placeholder')}
              error={nameError}
              required
              id="ob-name"
            />

            <div>
              <p className={styles.fieldLabel}>{t('vehicle.fuel_type')}</p>
              <div className={styles.chipRow}>
                {FUEL_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    selected={fuelType === opt.value}
                    onChange={() => setFuelType(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button onClick={handleGetStarted} loading={saving} fullWidth>
              {t('onboarding.get_started')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
