import type { BatteryTranslations } from './types.js'

/** Battery translations for Latvian. */
export const lv: BatteryTranslations = {
  'battery.charging': 'Uzlāde',
  'battery.discharging': 'Uz Baterijas',
  'battery.full': 'Pilnīgi Uzlādēts',
  'battery.not-charging': 'Neuzlādējas',
  'battery.unknown': 'Nezināms',
  'battery.remainingUnknown': 'Nezināms',
  'battery.remainingTime': '{{hours}}st {{minutes}}min',
  'battery.remainingMinutes': '{{minutes}}min',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nav iestatīts nodrošinātājs. Izsauciet `setProvider()` ar `BatteryProvider` ieviešanu — flotē nav nodrošinātāja; ieviesiet saskarni savā vietējā izpildlaikā un sasaistiet to.',
}
