import type { NetworkTranslations } from './types.js'

/** Network translations for Estonian. */
export const et: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Mobiilne',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Muu',
  'network.none': 'Ühendus puudub',
  'network.unknown': 'Teadmata',
  'network.error.connectionTimeout': 'Võrguühenduse ajalõpp',
  'network.error.unavailable': 'Võrk pole saadaval',
  'network.error.missingDependency':
    '`{{library}}` on kohustuslik, aga pole installitud. Installige see käsuga: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Pakkujat pole määratud. Kutsu `setProvider()` välja `NetworkProvider` implementatsiooniga (nt `@molecule/app-network-react-native`).',
}
