import type { NetworkTranslations } from './types.js'

/** Network translations for nb. */
export const nb: Partial<NetworkTranslations> = {
  'network.none': 'Frakoblet',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobil',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Annen',
  'network.unknown': 'Ukjent',
  'network.error.connectionTimeout': 'Tidsavbrudd for nettverkstilkobling',
  'network.error.unavailable': 'Nettverket er utilgjengelig',
  'network.error.missingDependency':
    '`{{library}}` er nødvendig, men ikke installert. Installer det med: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Ingen leverandør angitt. Kall `setProvider()` med en `NetworkProvider` -implementering (f.eks. fra `@molecule/app-network-react-native`).',
}
