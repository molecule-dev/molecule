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
}
