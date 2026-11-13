import type { NetworkTranslations } from './types.js'

/** Network translations for it. */
export const it: Partial<NetworkTranslations> = {
  'network.none': 'Scollegato',
  'network.unknown': 'Sconosciuto',
  'network.wifi': 'Wifi',
  'network.cellular': 'Cellulare',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Altro',
  'network.error.connectionTimeout': 'Timeout della connessione di rete',
  'network.error.unavailable': 'Rete non disponibile',
  'network.error.missingDependency':
    '`{{library}}` è richiesto ma non installato. Installalo con: `npm install {{library}}`',
  'network.error.noProvider':
    "`@molecule/app-network`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `NetworkProvider` (ad esempio, da `@molecule/app-network-react-native`).",
}
