import type { NetworkTranslations } from './types.js'

/** Network translations for uz. */
export const uz: Partial<NetworkTranslations> = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Uyali aloqa',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Boshqa',
  'network.none': 'Uzilgan',
  'network.error.connectionTimeout': 'Tarmoq ulanishi vaqti tugadi',
  'network.error.unavailable': 'Tarmoq mavjud emas',
  'network.unknown': "Noma'lum",
  'network.error.missingDependency':
    "`{{library}}` talab qilinadi, lekin o'rnatilmagan. Uni quyidagi bilan o'rnating: `npm install {{library}}`",
  'network.error.noProvider':
    "`@molecule/app-network`: Provayder o'rnatilmagan. `NetworkProvider` implementatsiyasi bilan `setProvider()` chaqiring (masalan, `@molecule/app-network-react-native`).",
}
