import type { NetworkTranslations } from './types.js'

/** Network translations for pt. */
export const pt: Partial<NetworkTranslations> = {
  'network.none': 'Desconectado',
  'network.unknown': 'Desconhecido',
  'network.wifi': 'Wi-fi',
  'network.cellular': 'Celular',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Outro',
  'network.error.connectionTimeout': 'Tempo limite de conexão de rede',
  'network.error.unavailable': 'Rede indisponível',
  'network.error.missingDependency':
    '`{{library}}` é necessária, mas não está instalada. Instale-a com: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Nenhum provedor definido. Chame `setProvider()` com uma implementação `NetworkProvider` (por exemplo, de `@molecule/app-network-react-native`).',
}
