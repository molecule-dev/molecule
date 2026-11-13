import type { NetworkTranslations } from './types.js'

/** Network translations for Icelandic. */
export const is: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Farsíma',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Annað',
  'network.none': 'Aftengt',
  'network.unknown': 'Óþekkt',
  'network.error.connectionTimeout': 'Nettenging rann út á tíma',
  'network.error.unavailable': 'Net ekki tiltækt',
  'network.error.missingDependency':
    '`{{library}}` er krafist en ekki uppsett. Setjið það upp með: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Enginn veitandi stilltur. Kallaðu á `setProvider()` með `NetworkProvider` útfærslu (t.d. frá `@molecule/app-network-react-native`).',
}
