import type { NetworkTranslations } from './types.js'

/** Network translations for Swahili. */
export const sw: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mtandao wa Simu',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Nyingine',
  'network.none': 'Imekatika',
  'network.unknown': 'Haijulikani',
  'network.error.connectionTimeout': 'Muda wa muunganisho wa mtandao umeisha',
  'network.error.unavailable': 'Mtandao haupatikani',
  'network.error.missingDependency':
    '`{{library}}` inahitajika lakini haijasakinishwa. Isakinishe na: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Hakuna mtoa huduma aliyewekwa. Piga simu `setProvider()` kwa kutumia utekelezaji wa `NetworkProvider` (km, kutoka `@molecule/app-network-react-native`).',
}
