import type { NetworkTranslations } from './types.js'

/** Network translations for Kazakh. */
export const kk: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Ұялы байланыс',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Басқа',
  'network.none': 'Ажыратылған',
  'network.unknown': 'Белгісіз',
  'network.error.connectionTimeout': 'Желі қосылымының уақыты бітті',
  'network.error.unavailable': 'Желі қолжетімсіз',
  'network.error.missingDependency':
    '`{{library}}` қажет, бірақ орнатылмаған. Оны келесідей орнатыңыз: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Провайдер орнатылмаған. `setProvider()` `NetworkProvider` іске асыруымен шақырыңыз (мысалы, `@molecule/app-network-react-native` функциясынан).',
}
