import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import bn from './bn.json'

function getPersistedLanguage(): string {
  try {
    const raw = localStorage.getItem('bahon-settings')
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { language?: string } }
      const lang = parsed?.state?.language
      if (lang === 'en' || lang === 'bn') return lang
    }
  } catch {
    // ignore
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    bn: { translation: bn },
  },
  lng: getPersistedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
