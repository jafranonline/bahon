import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip } from '@components/primitives/Chip'
import { Input } from '@components/primitives/Input'
import { Button } from '@components/primitives/Button'
import { useSettingsStore } from '@store/settingsStore'
import { useVehicleStore } from '@store/vehicleStore'
import { useAuthStore } from '@store/authStore'
import { addVehicle } from '@db/queries/useVehicles'
import { syncNow } from '@/sync/syncEngine'
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

type Step = 'language' | 'account' | 'vehicle'
type AuthMode = 'login' | 'register'

export function OnboardingScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const updateSettings = useSettingsStore((s) => s.update)
  const currentLang = useSettingsStore((s) => s.language)
  const setActiveVehicle = useVehicleStore((s) => s.setActiveVehicle)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const [step, setStep] = useState<Step>('language')

  // Account step
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  // Vehicle step
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle')
  const [fuelType, setFuelType] = useState<FuelType>('octane')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)

  function selectLanguage(lang: Language) {
    updateSettings({ language: lang })
    void i18n.changeLanguage(lang)
  }

  function finish() {
    updateSettings({ onboardingComplete: true })
    navigate('/', { replace: true })
  }

  const authErrorText = (code: string): string => {
    const map: Record<string, string> = {
      invalid_email: t('auth.err_invalid_email'),
      weak_password: t('auth.err_weak_password'),
      email_taken: t('auth.err_email_taken'),
      invalid_credentials: t('auth.err_invalid_credentials'),
    }
    return map[code] ?? t('auth.err_generic')
  }

  async function handleAuth() {
    setAuthError(null)
    if (!email.trim() || !password) {
      setAuthError(t('auth.err_required'))
      return
    }
    setAuthBusy(true)
    try {
      if (authMode === 'register') await register(email.trim(), password)
      else await login(email.trim(), password)
      // Logged in → pull their cloud data and finish; never ask to add a vehicle.
      updateSettings({ onboardingComplete: true })
      void syncNow()
      navigate('/', { replace: true })
    } catch (e) {
      setAuthError(authErrorText(e instanceof Error ? e.message : 'auth.err_generic'))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleAddVehicle() {
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
      finish()
    } finally {
      setSaving(false)
    }
  }

  const stepIndex = step === 'language' ? 0 : step === 'account' ? 1 : 2

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.dots}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === stepIndex ? styles.dotActive : i < stepIndex ? styles.dotDone : ''}`}
            />
          ))}
        </div>
      </div>

      {step === 'language' && (
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
            <Button onClick={() => setStep('account')} fullWidth>
              {t('onboarding.continue')}
            </Button>
          </div>
        </div>
      )}

      {step === 'account' && (
        <div className={styles.content}>
          <div className={styles.hero}>
            <span className={styles.heroIcon}>🔐</span>
            <h1 className={styles.title}>{t('onboarding.step_account_title')}</h1>
            <p className={styles.sub}>{t('onboarding.step_account_sub')}</p>
          </div>

          <div className={styles.form}>
            <div className={styles.tabs} role="tablist">
              <button
                role="tab"
                aria-selected={authMode === 'login'}
                className={`${styles.tab} ${authMode === 'login' ? styles.tabActive : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(null) }}
              >
                {t('auth.login')}
              </button>
              <button
                role="tab"
                aria-selected={authMode === 'register'}
                className={`${styles.tab} ${authMode === 'register' ? styles.tabActive : ''}`}
                onClick={() => { setAuthMode('register'); setAuthError(null) }}
              >
                {t('auth.register')}
              </button>
            </div>

            <Input
              type="email"
              label={t('auth.email')}
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              label={t('auth.password')}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              hint={authMode === 'register' ? t('auth.password_hint') : undefined}
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              suffix={
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4 10 7a12 12 0 01-2.2 3.2M6.2 6.2A12 12 0 002 12c1 3 5 7 10 7a9.6 9.6 0 003.7-.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  )}
                </button>
              }
            />
            {authError && <p className={styles.authError} role="alert">{authError}</p>}
            <Button onClick={handleAuth} loading={authBusy} fullWidth>
              {authMode === 'register' ? t('auth.create_account') : t('auth.sign_in')}
            </Button>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.skipLink} onClick={() => setStep('vehicle')}>
              {t('onboarding.skip')}
            </button>
          </div>
        </div>
      )}

      {step === 'vehicle' && (
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
            <Button onClick={handleAddVehicle} loading={saving} fullWidth>
              {t('onboarding.get_started')}
            </Button>
            <button type="button" className={styles.skipLink} onClick={finish}>
              {t('onboarding.skip')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
