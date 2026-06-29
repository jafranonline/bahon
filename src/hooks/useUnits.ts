import { useSettingsStore } from '@store/settingsStore'
import {
  formatDistance,
  formatVolume,
  formatEfficiency,
} from '@utils/formatters'

export function useUnits() {
  const distanceUnit = useSettingsStore((s) => s.distanceUnit)
  const volumeUnit = useSettingsStore((s) => s.volumeUnit)
  const efficiencyUnit = useSettingsStore((s) => s.efficiencyUnit)

  return {
    distanceUnit,
    volumeUnit,
    efficiencyUnit,
    formatDistance: (km: number) => formatDistance(km, distanceUnit),
    formatVolume: (litres: number) => formatVolume(litres, volumeUnit),
    formatEfficiency: (kmPerL: number) => formatEfficiency(kmPerL, efficiencyUnit),
  }
}
