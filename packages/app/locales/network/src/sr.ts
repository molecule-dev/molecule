import type { NetworkTranslations } from './types.js'

/** Network translations for Serbian. */
export const sr: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Мобилна мрежа',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Остало',
  'network.none': 'Искључено',
  'network.unknown': 'Непознато',
  'network.error.connectionTimeout': 'Истекло време мрежне везе',
  'network.error.unavailable': 'Мрежа није доступна',
  'network.error.missingDependency':
    '`{{library}}` је потребна, али није инсталирана. Инсталирајте је помоћу: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Није подешен провајдер. Позовите `setProvider()` са имплементацијом `NetworkProvider` (нпр. из `@molecule/app-network-react-native`).',
}
