import type { BatteryTranslations } from './types.js'

/** Battery translations for Malay. */
export const ms: BatteryTranslations = {
  'battery.charging': 'Mengecas',
  'battery.discharging': 'Menggunakan Bateri',
  'battery.full': 'Cas Penuh',
  'battery.not-charging': 'Tidak Mengecas',
  'battery.unknown': 'Tidak Diketahui',
  'battery.remainingUnknown': 'Tidak Diketahui',
  'battery.remainingTime': '{{hours}}j {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Tiada pembekal ditetapkan. Panggil `setProvider()` dengan pelaksanaan `BatteryProvider` — tiada pembekal yang dihantar bersama armada; laksanakan antara muka pada masa jalan natif anda dan ikatkannya.',
}
