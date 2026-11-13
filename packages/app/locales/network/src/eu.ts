import type { NetworkTranslations } from './types.js'

/** Network translations for Basque. */
export const eu: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Datu mugikorrak',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Bestelakoa',
  'network.none': 'Deskonektatuta',
  'network.unknown': 'Ezezaguna',
  'network.error.connectionTimeout': 'Sare-konexioaren denbora-muga gainditu da',
  'network.error.unavailable': 'Sarea ez dago erabilgarri',
  'network.error.missingDependency':
    '`{{library}}` beharrezkoa da baina ez dago instalatuta. Instalatu honekin: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Ez da hornitzailerik ezarri. Deitu `setProvider()` `NetworkProvider` inplementazio batekin (adibidez, `@molecule/app-network-react-native`).',
}
