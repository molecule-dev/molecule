import type { NetworkTranslations } from './types.js'

/** Network translations for ms. */
export const ms: Partial<NetworkTranslations> = {
  'network.none': 'Sambungan diputuskan',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Selular',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Lain-lain',
  'network.unknown': 'Tidak diketahui',
  'network.error.connectionTimeout': 'Tamat masa sambungan rangkaian',
  'network.error.unavailable': 'Rangkaian tidak tersedia',
  'network.error.missingDependency':
    '`{{library}}` diperlukan tetapi tidak dipasang. Pasangkannya dengan: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Tiada pembekal ditetapkan. Panggil `setProvider()` dengan pelaksanaan `NetworkProvider` (cth., daripada `@molecule/app-network-react-native`).',
}
