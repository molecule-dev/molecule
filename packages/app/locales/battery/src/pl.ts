import type { BatteryTranslations } from './types.js'

/** Battery translations for pl. */
export const pl: Partial<BatteryTranslations> = {
  'battery.unknown': 'Nieznany',
  'battery.remainingUnknown': 'Nieznany',
  'battery.charging': 'Ładowanie',
  'battery.discharging': 'Na baterii',
  'battery.full': 'W pełni naładowany',
  'battery.not-charging': 'Brak ładowania',
  'battery.remainingTime': '{{godzin}} H<x> {{protokół}}</x> M',
  'battery.remainingMinutes': '{{protokół}} M',
}
