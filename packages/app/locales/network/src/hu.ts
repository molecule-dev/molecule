import type { NetworkTranslations } from './types.js'

/** Network translations for hu. */
export const hu: Partial<NetworkTranslations> = {
  'network.none': 'Leválasztva',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Sejtes',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Más',
  'network.unknown': 'Ismeretlen',
  'network.error.connectionTimeout': 'Hálózati kapcsolat időtúllépése',
  'network.error.unavailable': 'Hálózat nem elérhető',
  'network.error.missingDependency':
    '`{{library}}` kötelező, de nincs telepítve. Telepítse a következő paranccsal: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Nincs beállítva szolgáltató. Hívjuk meg `setProvider()` függvényt egy `NetworkProvider` implementációval (pl. `@molecule/app-network-react-native` ből).',
}
