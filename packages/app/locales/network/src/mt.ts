import type { NetworkTranslations } from './types.js'

/** Network translations for Maltese. */
export const mt: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Cellulari',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Ohra',
  'network.none': 'Diskonness',
  'network.unknown': 'Mhux Maghruf',
  'network.error.connectionTimeout': 'Timeout tal-konnessjoni tan-netwerk',
  'network.error.unavailable': 'Netwerk mhux disponibbli',
  'network.error.missingDependency':
    "`{{library}}` hija meħtieġa iżda mhux installata. Installaha b': `npm install {{library}}`",
  'network.error.noProvider':
    "`@molecule/app-network`: L-ebda fornitur ma ġie stabbilit. Sejħa `setProvider()` b'implimentazzjoni ta `NetworkProvider` (eż., minn `@molecule/app-network-react-native`).",
}
