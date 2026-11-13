import type { NetworkTranslations } from './types.js'

/** Network translations for Bulgarian. */
export const bg: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Мобилна мрежа',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Друго',
  'network.none': 'Изключено',
  'network.unknown': 'Неизвестно',
  'network.error.connectionTimeout': 'Времето за мрежова връзка изтече',
  'network.error.unavailable': 'Мрежата е недостъпна',
  'network.error.missingDependency':
    '`{{library}}` е задължителна, но не е инсталирана. Инсталирайте я с: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Няма зададен доставчик. Извикайте `setProvider()` с имплементация на `NetworkProvider` (напр. от `@molecule/app-network-react-native`).',
}
