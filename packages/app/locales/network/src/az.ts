import type { NetworkTranslations } from './types.js'

/** Network translations for Azerbaijani. */
export const az: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobil şəbəkə',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Digər',
  'network.none': 'Bağlantı kəsilib',
  'network.unknown': 'Naməlum',
  'network.error.connectionTimeout': 'Şəbəkə bağlantısı vaxtı keçdi',
  'network.error.unavailable': 'Şəbəkə əlçatmazdır',
  'network.error.missingDependency':
    '`{{library}}` tələb olunur, lakin quraşdırılmayıb. Bunu bu şəkildə quraşdırın: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Provayder təyin edilməyib. `NetworkProvider` implementasiyası ilə `setProvider()` çağırın (məsələn, `@molecule/app-network-react-native` dən).',
}
