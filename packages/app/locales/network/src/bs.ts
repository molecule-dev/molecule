import type { NetworkTranslations } from './types.js'

/** Network translations for Bosnian. */
export const bs: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobilna mreža',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ostalo',
  'network.none': 'Prekinuta veza',
  'network.unknown': 'Nepoznato',
  'network.error.connectionTimeout': 'Isteklo vrijeme mrežne veze',
  'network.error.unavailable': 'Mreža nedostupna',
  'network.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga sa: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Nije postavljen provajder. Pozovite `setProvider()` s implementacijom `NetworkProvider` (npr. iz `@molecule/app-network-react-native`).',
}
