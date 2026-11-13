import type { NetworkTranslations } from './types.js'

/** Network translations for es. */
export const es: Partial<NetworkTranslations> = {
  'network.none': 'Desconectado',
  'network.unknown': 'Desconocido',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Celular',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Otro',
  'network.error.connectionTimeout': 'Tiempo de espera de conexión de red agotado',
  'network.error.unavailable': 'Red no disponible',
  'network.error.missingDependency':
    '`{{library}}` es necesaria pero no está instalada. Instálela con: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: No se ha configurado ningún proveedor. Llame `setProvider()` con una implementación de `NetworkProvider` (por ejemplo, desde `@molecule/app-network-react-native`).',
}
