import type { NetworkTranslations } from './types.js'

/** Network translations for Yoruba. */
export const yo: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Nẹ́tíwọ̀ọ̀kì fóònù',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Òmíràn',
  'network.none': 'Tí a ti yọ kúrò',
  'network.unknown': 'Aìmọ̀',
  'network.error.connectionTimeout': 'Àkókò ìsopọ̀ nẹ́tíwọ̀ọ̀kì ti parí',
  'network.error.unavailable': 'Nẹ́tíwọ̀ọ̀kì kò sí',
  'network.error.missingDependency':
    'Ó ṣe pàtàkì láti fi `{{library}}` síbẹ̀ kò sí nínú rẹ̀. Fi sori ẹ̀rọ náà pẹ̀lú: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Kò sí ètò olùpèsè. Pe `setProvider()` pẹ̀lú ìmúṣẹ `NetworkProvider` (fún àpẹẹrẹ, láti `@molecule/app-network-react-native`).',
}
