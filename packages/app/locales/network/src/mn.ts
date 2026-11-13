import type { NetworkTranslations } from './types.js'

/** Network translations for Mongolian. */
export const mn: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Мобайл дата',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Бусад',
  'network.none': 'Салгагдсан',
  'network.unknown': 'Тодорхойгүй',
  'network.error.connectionTimeout': 'Сүлжээний холболтын хугацаа дууссан',
  'network.error.unavailable': 'Сүлжээ боломжгүй',
  'network.error.missingDependency':
    '`{{library}}` шаардлагатай боловч суулгаагүй байна. Үүнийг дараах тушаалаар суулгана уу: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Үйлчилгээ үзүүлэгч тохируулагдаагүй байна. `NetworkProvider` хэрэгжүүлэлттэй (жишээ нь, `@molecule/app-network-react-native` аас) `setProvider()` дуудна уу.',
}
