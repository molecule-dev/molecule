import type { NetworkTranslations } from './types.js'

/** Network translations for ca. */
export const ca: Partial<NetworkTranslations> = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Dades mòbils',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Altres',
  'network.none': 'Desconnectat',
  'network.unknown': 'Desconegut',
  'network.error.unavailable': 'Xarxa no disponible',
  'network.error.connectionTimeout': "Temps d'espera de la connexió de xarxa",
  'network.error.missingDependency':
    '`{{library}}` és obligatori però no està instal·lat. Instal·leu-lo amb: `npm install {{library}}`',
  'network.error.noProvider':
    "`@molecule/app-network`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `NetworkProvider` (per exemple, des de `@molecule/app-network-react-native`).",
}
