import type { NetworkTranslations } from './types.js'

/** Network translations for Galician. */
export const gl: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Datos móbiles',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Outro',
  'network.none': 'Desconectado',
  'network.unknown': 'Descoñecido',
  'network.error.connectionTimeout': 'Tempo de espera da conexión de rede esgotado',
  'network.error.unavailable': 'Rede non dispoñible',
  'network.error.missingDependency':
    '`{{library}}` é necesario pero non está instalado. Instálao con: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Non se estableceu ningún provedor. Chama `setProvider()` cunha implementación `NetworkProvider` (por exemplo, desde `@molecule/app-network-react-native`).',
}
