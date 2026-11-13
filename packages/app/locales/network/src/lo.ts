import type { NetworkTranslations } from './types.js'

/** Network translations for Lao. */
export const lo: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'ເຄືອຂ່າຍມືຖື',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'ອື່ນໆ',
  'network.none': 'ຕັດການເຊື່ອມຕໍ່',
  'network.unknown': 'ບໍ່ຮູ້',
  'network.error.connectionTimeout': 'ໝົດເວລາເຊື່ອມຕໍ່ເຄືອຂ່າຍ',
  'network.error.unavailable': 'ເຄືອຂ່າຍບໍ່ພ້ອມໃຊ້ງານ',
  'network.error.missingDependency':
    'ຕ້ອງມີ `{{library}}` ແຕ່ຍັງບໍ່ໄດ້ຕິດຕັ້ງ. ຕິດຕັ້ງມັນດ້ວຍ: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: ບໍ່ໄດ້ຕັ້ງຜູ້ໃຫ້ບໍລິການໄວ້. ເອີ້ນໃຊ້ `setProvider()` ດ້ວຍການຈັດຕັ້ງປະຕິບັດ `NetworkProvider` (ຕົວຢ່າງ, ຈາກ `@molecule/app-network-react-native`).',
}
