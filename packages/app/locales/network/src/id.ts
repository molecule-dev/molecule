import type { NetworkTranslations } from './types.js'

/** Network translations for id. */
export const id: Partial<NetworkTranslations> = {
  'network.none': 'Terputus',
  'network.unknown': 'Tidak diketahui',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Seluler',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Lainnya',
  'network.error.connectionTimeout': 'Waktu habis koneksi jaringan',
  'network.error.unavailable': 'Jaringan tidak tersedia',
  'network.error.missingDependency':
    '`{{library}}` diperlukan tetapi belum terpasang. Pasang dengan: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Tidak ada provider yang ditetapkan. Panggil `setProvider()` dengan implementasi `NetworkProvider` (misalnya, dari `@molecule/app-network-react-native`).',
}
