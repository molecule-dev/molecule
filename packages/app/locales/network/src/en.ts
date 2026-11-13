import type { NetworkTranslations } from './types.js'

/** Network translations for English. */
export const en: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Cellular',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Other',
  'network.none': 'Disconnected',
  'network.unknown': 'Unknown',
  'network.error.connectionTimeout': 'Network connection timeout',
  'network.error.unavailable': 'Network unavailable',
  'network.error.missingDependency':
    '`{{library}}` is required but not installed. Install it with: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: No provider set. Call `setProvider()` with a `NetworkProvider` implementation (e.g., from `@molecule/app-network-react-native`).',
}
