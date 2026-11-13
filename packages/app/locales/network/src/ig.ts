import type { NetworkTranslations } from './types.js'

/** Network translations for Igbo. */
export const ig: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Selula',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Nke ọzọ',
  'network.none': 'Ekwusịrị njikọ',
  'network.unknown': 'Amaghị',
  'network.error.connectionTimeout': 'Oge njikọ netwọk agwụla',
  'network.error.unavailable': 'Netwọk adịghị',
  'network.error.missingDependency':
    'A chọrọ `{{library}}` mana etinyereghị ya. Wụnye ya na: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Enweghị ntọala onye na-enye ọrụ. Kpọọ `setProvider()` site na iji `NetworkProvider` eme ihe (dịka ọmụmaatụ, site na `@molecule/app-network-react-native`).',
}
