import type { NetworkTranslations } from './types.js'

/** Network translations for Latvian. */
export const lv: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobilais tīkls',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Cits',
  'network.none': 'Atvienots',
  'network.unknown': 'Nezināms',
  'network.error.connectionTimeout': 'Tīkla savienojuma noildze',
  'network.error.unavailable': 'Tīkls nav pieejams',
  'network.error.missingDependency':
    '`{{library}}` ir obligāta, bet nav instalēta. Instalējiet to, izmantojot: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Nav iestatīts nodrošinātājs. Izsauciet `setProvider()` ar `NetworkProvider` ieviešanu (piemēram, no `@molecule/app-network-react-native`).',
}
