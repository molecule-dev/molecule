import type { NetworkTranslations } from './types.js'

/** Network translations for ro. */
export const ro: Partial<NetworkTranslations> = {
  'network.none': 'Deconectat',
  'network.wifi': 'Wifi',
  'network.cellular': 'Celular',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN-ul',
  'network.other': 'Alte',
  'network.unknown': 'Necunoscut',
  'network.error.connectionTimeout': 'Expirare conexiune la rețea',
  'network.error.unavailable': 'Rețea indisponibilă',
  'network.error.missingDependency':
    '`{{library}}` este necesar, dar nu este instalat. Instalați-l cu: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Niciun furnizor setat. Apelați `setProvider()` cu o implementare de `NetworkProvider` (de exemplu, din `@molecule/app-network-react-native`).',
}
