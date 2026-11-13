import type { NetworkTranslations } from './types.js'

/** Network translations for tr. */
export const tr: Partial<NetworkTranslations> = {
  'network.none': 'Bağlantı kesildi',
  'network.unknown': 'Bilinmiyor',
  'network.wifi': 'Wifi',
  'network.cellular': 'Hücresel',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Diğer',
  'network.error.connectionTimeout': 'Ağ bağlantısı zaman aşımı',
  'network.error.unavailable': 'Ağ kullanılamıyor.',
  'network.error.missingDependency':
    '`{{library}}` kütüphanesi gereklidir ancak yüklü değil. Şu komutla yükleyin: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Sağlayıcı ayarlanmadı. `setProvider()` bir `NetworkProvider` uygulamasıyla (örneğin, `@molecule/app-network-react-native`) çağırın.',
}
