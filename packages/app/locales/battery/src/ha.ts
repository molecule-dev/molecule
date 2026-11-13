import type { BatteryTranslations } from './types.js'

/** Battery translations for Hausa. */
export const ha: BatteryTranslations = {
  'battery.charging': 'Ana caji',
  'battery.discharging': 'A kan baturi',
  'battery.full': 'Caji ya cika',
  'battery.not-charging': 'Ba a caji ba',
  'battery.unknown': 'Ba a sani ba',
  'battery.remainingUnknown': 'Ba a sani ba',
  'battery.remainingTime': '{{hours}}sa {{minutes}}min',
  'battery.remainingMinutes': '{{minutes}}min',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Babu saitin mai bada sabis. Kira `setProvider()` tare da aiwatar da `BatteryProvider` — Molecule ba ya aika da mai bada sabis don sa; aiwatar da hanyar haɗin yanar gizo akan lokacin aiki na asali kuma haɗa shi.',
}
