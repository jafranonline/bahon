import { useSettingsStore } from '@store/settingsStore'
import { formatCurrency, getCurrencySymbol } from '@utils/formatters'

export function useCurrency() {
  const currency = useSettingsStore((s) => s.currency)

  return {
    currency,
    symbol: getCurrencySymbol(currency),
    format: (amount: number, compact = false) => formatCurrency(amount, currency, compact),
  }
}
