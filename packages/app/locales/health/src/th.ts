import type { HealthTranslations } from './types.js'

/** Health translations for Thai. */
export const th: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ชม {{minutes}}น',
  'health.durationMinutes': '{{minutes}}น',
  'health.error.noProvider':
    '`@molecule/app-health`: ไม่มีการเชื่อมต่อผู้ให้บริการด้านสุขภาพ — โปรดใช้งานอินเทอร์เฟซ `HealthProvider` บนรันไทม์ดั้งเดิมของคุณ (Apple HealthKit / Android Health Connect / Google Fit) และเชื่อมต่อด้วย `setProvider()` ในระหว่างการเริ่มต้น Molecule ไม่ได้จัดเตรียมผู้ให้บริการสำหรับอินเทอร์เฟซนี้ ตรวจสอบคุณสมบัติด้วย `hasProvider()` หรือ `getCapabilities().supported` ก่อนเรียกใช้ — การอ่านข้อมูลสุขภาพไม่มีค่าเริ่มต้นที่ถูกต้อง ดังนั้นจึงเกิดข้อผิดพลาดแทนที่จะส่งคืนข้อมูลปลอม',
}
