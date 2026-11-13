import type { NetworkTranslations } from './types.js'

/** Network translations for Thai. */
export const th: NetworkTranslations = {
  'network.wifi': 'Wi-Fi',
  'network.cellular': 'เซลลูลาร์',
  'network.ethernet': 'Ethernet',
  'network.bluetooth': 'Bluetooth',
  'network.vpn': 'VPN',
  'network.other': 'อื่นๆ',
  'network.none': 'ไม่ได้เชื่อมต่อ',
  'network.unknown': 'ไม่ทราบ',
  'network.error.connectionTimeout': 'การเชื่อมต่อเครือข่ายหมดเวลา',
  'network.error.unavailable': 'เครือข่ายไม่พร้อมใช้งาน',
  'network.error.missingDependency':
    '`{{library}}` เป็นสิ่งที่จำเป็น แต่ยังไม่ได้ติดตั้ง โปรดติดตั้งโดยใช้คำสั่ง: `npm install {{library}}`',
  'network.error.noProvider':
    '`@molecule/app-network`: ไม่ได้ตั้งค่า provider ไว้ เรียกใช้ `setProvider()` ด้วยการใช้งาน `NetworkProvider` (เช่น จาก `@molecule/app-network-react-native`)',
}
