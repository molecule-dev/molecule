import type { NetworkTranslations } from './types.js'

/** Network translations for Macedonian. */
export const mk: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Мобилна мрежа',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Друго',
  'network.none': 'Исклучено',
  'network.unknown': 'Непознато',
  'network.error.connectionTimeout': 'Истече времето за мрежна конекција',
  'network.error.unavailable': 'Мрежата е недостапна',
  'network.error.missingDependency':
    '`{{library}}` е задолжителна, но не е инсталирана. Инсталирајте ја со: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Не е поставен провајдер. Повикајте `setProvider()` со имплементација на `NetworkProvider` (на пр., од `@molecule/app-network-react-native`).',
}
