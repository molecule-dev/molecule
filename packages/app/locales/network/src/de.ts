import type { NetworkTranslations } from './types.js'

/** Network translations for de. */
export const de: Partial<NetworkTranslations> = {
  'network.none': 'Getrennt',
  'network.unknown': 'Unbekannt',
  'network.wifi': 'W-lan',
  'network.cellular': 'Mobilfunk',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Andere',
  'network.error.connectionTimeout': 'Zeitüberschreitung der Netzwerkverbindung',
  'network.error.unavailable': 'Netzwerk nicht verfügbar',
  'network.error.missingDependency':
    '`{{library}}` wird benötigt, ist aber nicht installiert. Installieren Sie sie mit: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `NetworkProvider` -Implementierung auf (z. B. von `@molecule/app-network-react-native`).',
}
