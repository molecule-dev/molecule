import type { NetworkTranslations } from './types.js'

/** Network translations for Russian. */
export const ru: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Сотовая сеть',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Другое',
  'network.none': 'Отключено',
  'network.unknown': 'Неизвестно',
  'network.error.connectionTimeout': 'Время ожидания сетевого подключения истекло',
  'network.error.unavailable': 'Сеть недоступна',
  'network.error.missingDependency':
    '`{{library}}` необходима, но не установлена. Установите её с помощью команды: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Провайдер не установлен. Вызовите `setProvider()` с реализацией `NetworkProvider` (например, из `@molecule/app-network-react-native`).',
}
