import type { BatteryTranslations } from './types.js'

/** Battery translations for Croatian. */
export const hr: BatteryTranslations = {
  'battery.charging': 'Punjenje',
  'battery.discharging': 'Na bateriji',
  'battery.full': 'Potpuno napunjeno',
  'battery.not-charging': 'Ne puni se',
  'battery.unknown': 'Nepoznato',
  'battery.remainingUnknown': 'Nepoznato',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nije postavljen pružatelj usluga. Pozovite `setProvider()` s implementacijom `BatteryProvider` — nijedan pružatelj usluga ne dolazi s flotom; implementirajte sučelje u svom izvornom okruženju za izvođenje i povežite ga.',
}
