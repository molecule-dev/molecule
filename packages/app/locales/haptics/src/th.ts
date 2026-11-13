import type { HapticsTranslations } from './types.js'

/** Haptics translations for Thai. */
export const th: HapticsTranslations = {
  'haptics.error.noProvider':
    '`@molecule/app-haptics`: ไม่ได้ตั้งค่า provider ไว้ เรียกใช้ `setProvider()` ด้วยการใช้งาน `HapticsProvider` — Molecule ไม่ได้จัดส่ง provider สำหรับอินเทอร์เฟซนี้มาให้ คุณต้องใช้งานอินเทอร์เฟซนี้ใน runtime ดั้งเดิมของคุณและทำการ bond เข้าด้วยกัน',
}
