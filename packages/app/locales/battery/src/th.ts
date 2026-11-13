import type { BatteryTranslations } from './types.js'

/** Battery translations for Thai. */
export const th: BatteryTranslations = {
  'battery.charging': 'กำลังชาร์จ',
  'battery.discharging': 'ใช้แบตเตอรี่',
  'battery.full': 'ชาร์จเต็มแล้ว',
  'battery.not-charging': 'ไม่ได้ชาร์จ',
  'battery.unknown': 'ไม่ทราบ',
  'battery.remainingUnknown': 'ไม่ทราบ',
  'battery.remainingTime': '{{hours}}ชม. {{minutes}}น.',
  'battery.remainingMinutes': '{{minutes}}น.',
  'battery.error.noProvider':
    '`@molecule/app-battery`: ไม่ได้ตั้งค่าผู้ให้บริการ เรียกใช้ `setProvider()` ด้วยการใช้งาน `BatteryProvider` — ไม่มีผู้ให้บริการใด ๆ มาพร้อมกับกลุ่มอุปกรณ์ โปรดใช้งานอินเทอร์เฟซบนรันไทม์เนทีฟของคุณและเชื่อมต่อเข้าด้วยกัน',
}
