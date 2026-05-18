import type { BatteryTranslations } from './types.js'

/** Battery translations for sv. */
export const sv: Partial<BatteryTranslations> = {
  'battery.unknown': 'Okänd',
  'battery.remainingUnknown': 'Okänd',
  'battery.remainingMinutes': '{{minutes}}min',
  'battery.charging': 'Laddning',
  'battery.discharging': 'På batteri',
  'battery.full': 'Fulladdad',
  'battery.not-charging': 'Laddar inte',
  'battery.remainingTime': '{{timmar}} h<x> {{minuter}}</x> m',
}
