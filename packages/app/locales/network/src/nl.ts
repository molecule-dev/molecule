import type { NetworkTranslations } from './types.js'

/** Network translations for nl. */
export const nl: Partial<NetworkTranslations> = {
  'network.none': 'Ontkoppeld',
  'network.unknown': 'Onbekend',
  'network.wifi': 'Wifi',
  'network.cellular': 'Cellulair',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ander',
  'network.error.connectionTimeout': 'Time-out van de netwerkverbinding',
  'network.error.unavailable': 'Netwerk niet beschikbaar',
  'network.error.missingDependency':
    '`{{library}}` is vereist, maar niet geïnstalleerd. Installeer het met: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Er is geen provider ingesteld. Roep `setProvider()` aan met een `NetworkProvider` implementatie (bijvoorbeeld van `@molecule/app-network-react-native`).',
}
