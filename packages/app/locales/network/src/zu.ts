import type { NetworkTranslations } from './types.js'

/** Network translations for Zulu. */
export const zu: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Inethiwekhi Yeselula',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Okunye',
  'network.none': 'Inqanyuliwe',
  'network.unknown': 'Akwaziwa',
  'network.error.connectionTimeout': 'Isikhathi sokuxhuma inethiwekhi siphelile',
  'network.error.unavailable': 'Inethiwekhi ayitholakali',
  'network.error.missingDependency':
    '`{{library}}` iyadingeka kodwa ayifakiwe. Faka nge: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Akukho umhlinzeki osethiwe. Shayela `setProvider()` ngokusetshenziswa kwe `NetworkProvider` (isb., kusuka ku `@molecule/app-network-react-native`).',
}
