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
    '`@molecule/app-battery`: Akukho umhlinzeki osethiwe. Shayela `setProvider()` ngokusebenzisa i `BatteryProvider` — akukho umhlinzeki othunyelwa neqembu; sebenzisa isikhombimsebenzisi ngesikhathi sakho sokusebenza bese usibopha.',
}
