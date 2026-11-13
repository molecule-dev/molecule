import type { BatteryTranslations } from './types.js'

/** Battery translations for Kyrgyz. */
export const ky: BatteryTranslations = {
  'battery.charging': 'Кубатталууда',
  'battery.discharging': 'Батарейда',
  'battery.full': 'Толук кубатталган',
  'battery.not-charging': 'Кубатталбай жатат',
  'battery.unknown': 'Белгисиз',
  'battery.remainingUnknown': 'Белгисиз',
  'battery.remainingTime': '{{hours}}с {{minutes}}мин',
  'battery.remainingMinutes': '{{minutes}}мин',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Провайдер коюлган эмес. `setProvider()` функциясын `BatteryProvider` реализациясы менен чакырыңыз — Molecule ага эч кандай провайдер жөнөтпөйт; интерфейсти өзүңүздүн жергиликтүү иштөө убактыңызга ишке ашырып, аны байланыштырыңыз.',
}
