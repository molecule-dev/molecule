import type { NetworkTranslations } from './types.js'

/** Network translations for ha. */
export const ha: Partial<NetworkTranslations> = {
  'network.wifi': 'Wi-Fi',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Wani',
  'network.none': 'An yanke haɗi',
  'network.unknown': 'Ba a sani ba',
  'network.error.connectionTimeout': 'Lokacin haɗin hanyar sadarwa ya ƙare',
  'network.error.unavailable': 'Hanyar sadarwa ba ta samuwa',
  'network.cellular': 'Wayar salula',
  'network.error.missingDependency':
    'Ana buƙatar `{{library}}` amma ba a shigar da shi ba. Shigar da shi da: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Babu saitin mai bada sabis. Kira `setProvider()` tare da aiwatar da `NetworkProvider` (misali, daga `@molecule/app-network-react-native`).',
}
