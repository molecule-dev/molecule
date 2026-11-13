import type { NetworkTranslations } from './types.js'

/** Network translations for fi. */
export const fi: Partial<NetworkTranslations> = {
  'network.none': 'Yhteys katkaistu',
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Matkapuhelin',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Muut',
  'network.unknown': 'Tuntematon',
  'network.error.connectionTimeout': 'Verkkoyhteyden aikakatkaisu',
  'network.error.unavailable': 'Verkko ei ole käytettävissä',
  'network.error.missingDependency':
    '`{{library}}` on pakollinen, mutta sitä ei ole asennettu. Asenna se komennolla: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Ei määritettyä toimittajaa. Kutsu `setProvider()` `NetworkProvider` -toteutuksella (esim. `@molecule/app-network-react-native`).',
}
