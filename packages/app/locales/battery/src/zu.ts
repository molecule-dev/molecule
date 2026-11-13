import type { BatteryTranslations } from './types.js'

/** Battery translations for Zulu. */
export const zu: BatteryTranslations = {
  'battery.charging': 'Iyashaja',
  'battery.discharging': 'Isebenzisa Ibhethri',
  'battery.full': 'Igcwele Ngokuphelele',
  'battery.not-charging': 'Ayishaji',
  'battery.unknown': 'Akwaziwa',
  'battery.remainingUnknown': 'Akwaziwa',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Akukho umhlinzeki osethiwe. Shayela `setProvider()` ngokusetshenziswa kwe `BatteryProvider` — I-Molecule ayithumeli umhlinzeki wayo; sebenzisa isikhombimsebenzisi kusikhathi sakho sokusebenza bese usibopha.',
}
