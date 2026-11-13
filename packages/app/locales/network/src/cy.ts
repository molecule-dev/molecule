import type { NetworkTranslations } from './types.js'

/** Network translations for Welsh. */
export const cy: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Cellog',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Arall',
  'network.none': 'Wedi Datgysylltu',
  'network.unknown': 'Anhysbys',
  'network.error.connectionTimeout': 'Cysylltiad rhwydwaith wedi dod i ben',
  'network.error.unavailable': 'Rhwydwaith ddim ar gael',
  'network.error.missingDependency':
    "Mae angen `{{library}}` ond nid yw wedi'i osod. Gosodwch ef gyda: `npm install {{library}}`",
  'network.error.noProvider':
    "`@molecule/app-network`: Dim darparwr wedi'i osod. Ffoniwch `setProvider()` gyda gweithrediad `NetworkProvider` (e.e., o `@molecule/app-network-react-native`).",
}
