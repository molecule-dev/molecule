import type { NetworkTranslations } from './types.js'

/** Network translations for Croatian. */
export const hr: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobilna mreža',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ostalo',
  'network.none': 'Odspojeno',
  'network.unknown': 'Nepoznato',
  'network.error.connectionTimeout': 'Isteklo vrijeme mrežne veze',
  'network.error.unavailable': 'Mreža nedostupna',
  'network.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga s: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Nije postavljen pružatelj usluga. Pozovite `setProvider()` s implementacijom `NetworkProvider` (npr. iz `@molecule/app-network-react-native`).',
}
