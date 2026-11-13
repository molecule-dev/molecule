import type { NetworkTranslations } from './types.js'

/** Network translations for Albanian. */
export const sq: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'Celular',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'Tjeter',
  'network.none': 'I Shkëputur',
  'network.unknown': 'E panjohur',
  'network.error.connectionTimeout': 'Lidhja e rrjetit ka skaduar',
  'network.error.unavailable': 'Rrjeti nuk eshte i disponueshem',
  'network.error.missingDependency':
    '`{{library}}` është e detyrueshme, por nuk është instaluar. Instalojeni me: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: Nuk është caktuar asnjë ofrues. Thirrni `setProvider()` me një implementim `NetworkProvider` (p.sh., nga `@molecule/app-network-react-native`).',
}
