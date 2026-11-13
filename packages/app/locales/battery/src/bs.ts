import type { BatteryTranslations } from './types.js'

/** Battery translations for Bosnian. */
export const bs: BatteryTranslations = {
  'battery.charging': 'Punjenje',
  'battery.discharging': 'Na bateriji',
  'battery.full': 'Potpuno napunjeno',
  'battery.not-charging': 'Ne puni se',
  'battery.unknown': 'Nepoznato',
  'battery.remainingUnknown': 'Nepoznato',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nije postavljen provajder. Pozovite `setProvider()` s implementacijom `BatteryProvider` — Molecule ne isporučuje provajdera za njega; implementirajte interfejs na vašem izvornom okruženju za izvršavanje i povežite ga.',
}
