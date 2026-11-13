import type { NetworkTranslations } from './types.js'

/** Network translations for Armenian. */
export const hy: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Bjjayin',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ayl',
  'network.none': 'Anjatvac',
  'network.unknown': 'Anhayt',
  'network.error.connectionTimeout': 'Cancanyin kapy sparvel e',
  'network.error.unavailable': 'Cancanutyuny anhasaneli e',
  'network.error.missingDependency':
    '`{{library}}` պարտադիր է, բայց տեղադրված չէ։ Տեղադրեք այն՝ `npm install {{library}}` ով։',
  'network.error.noProvider':
    '`@molecule/app-network`: Մատակարար սահմանված չէ: Կանչեք `setProvider()` ը `NetworkProvider` իրականացմամբ (օրինակ՝ `@molecule/app-network-react-native` ից):',
}
