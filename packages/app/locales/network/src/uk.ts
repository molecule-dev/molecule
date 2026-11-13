import type { NetworkTranslations } from './types.js'

/** Network translations for uk. */
export const uk: Partial<NetworkTranslations> = {
  'network.none': 'Відключено',
  'network.wifi': 'Wi-Fi',
  'network.cellular': "Стільниковий зв'язок",
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Блютуз',
  'network.vpn': 'VPN',
  'network.other': 'Інше',
  'network.unknown': 'Невідомо',
  'network.error.connectionTimeout': "Тайм-аут мережевого з'єднання",
  'network.error.unavailable': 'Мережа недоступна',
  'network.error.missingDependency':
    "`{{library}}` обов'язковий, але не встановлений. Встановіть його за допомогою: `npm install {{library}}`",
  'network.error.noProvider':
    '`@molecule/app-network`: Постачальника не встановлено. Викличте `setProvider()` з реалізацією `NetworkProvider` (наприклад, з `@molecule/app-network-react-native`).',
}
