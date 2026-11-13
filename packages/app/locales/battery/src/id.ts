import type { BatteryTranslations } from './types.js'

/** Battery translations for id. */
export const id: Partial<BatteryTranslations> = {
  'battery.unknown': 'Tidak diketahui',
  'battery.remainingUnknown': 'Tidak diketahui',
  'battery.remainingMinutes': '{{minutes}}mnt',
  'battery.charging': 'Pengisian daya',
  'battery.discharging': 'Menggunakan Baterai',
  'battery.full': 'Terisi Penuh',
  'battery.not-charging': 'Tidak Menagih',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Tidak ada penyedia yang ditetapkan. Panggil `setProvider()` dengan implementasi `BatteryProvider` — tidak ada penyedia yang disertakan dalam armada; implementasikan antarmuka pada runtime asli Anda dan ikatlah.',
}
