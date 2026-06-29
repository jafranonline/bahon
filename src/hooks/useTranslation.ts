import { useTranslation as useI18nTranslation } from 'react-i18next'
import type en from '@i18n/en.json'

type TranslationKeys = typeof en

export function useTranslation() {
  return useI18nTranslation<'translation', TranslationKeys>()
}
