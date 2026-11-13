import type { NetworkTranslations } from './types.js'

/** Network translations for fil. */
export const fil: Partial<NetworkTranslations> = {
  'network.none': 'Nadiskonekta',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Selular',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Iba pa',
  'network.unknown': 'Hindi Kilala',
  'network.error.connectionTimeout': 'Naubusan ng oras ang koneksyon sa network',
  'network.error.unavailable': 'Hindi magagamit ang network',
  'network.error.missingDependency':
    'Kinakailangan ang `{{library}}` ngunit hindi pa naka-install. I-install ito gamit ang: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Walang nakatakdang provider. Tawagin `setProvider()` gamit ang isang implementasyong `NetworkProvider` (hal., mula sa `@molecule/app-network-react-native`).',
}
