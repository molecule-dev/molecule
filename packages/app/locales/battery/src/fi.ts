import type { BatteryTranslations } from './types.js'

/** Battery translations for Finnish. */
export const fi: BatteryTranslations = {
  'battery.charging': 'Latautuu',
  'battery.discharging': 'Akulla',
  'battery.full': 'Täysin Ladattu',
  'battery.not-charging': 'Ei Lataudu',
  'battery.unknown': 'Tuntematon',
  'battery.remainingUnknown': 'Tuntematon',
  'battery.remainingTime': '{{hours}}t {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Ei toimittajaa asetettu. Kutsu `setProvider()` -funktiota `BatteryProvider` -toteutuksella — Molecule ei toimita sille toimittajaa; toteuta rajapinta natiivissa suoritusympäristössäsi ja yhdistä se.',
}
