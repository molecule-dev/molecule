import type { NetworkTranslations } from './types.js'

/** Network translations for Irish. */
export const ga: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Ceallach',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Eile',
  'network.none': 'Dícheangailte',
  'network.unknown': 'Anaithnid',
  'network.error.connectionTimeout': 'Ceangal líonra imithe thar am',
  'network.error.unavailable': 'Líonra nach bhfuil ar fáil',
  'network.error.missingDependency':
    'Tá `{{library}}` riachtanach ach níl sé suiteáilte. Suiteáil é le: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Níl aon soláthraí socraithe. Glaoigh ar `setProvider()` le cur i bhfeidhm `NetworkProvider` (m.sh., ó `@molecule/app-network-react-native`).',
}
