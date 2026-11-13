import type { NetworkTranslations } from './types.js'

/** Network translations for Afrikaans. */
export const af: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Sellulêr',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ander',
  'network.none': 'Ontkoppel',
  'network.unknown': 'Onbekend',
  'network.error.connectionTimeout': 'Netwerkverbinding het uitgetel',
  'network.error.unavailable': 'Netwerk onbeskikbaar',
  'network.error.missingDependency':
    '`{{library}}` word vereis, maar is nie geïnstalleer nie. Installeer dit met: `npm install {{library}}`',
  'network.error.noProvider':
    "`@molecule/app-network`: Geen verskaffer gestel nie. Roep `setProvider()` met 'n `NetworkProvider` implementering (bv. vanaf `@molecule/app-network-react-native`).",
}
