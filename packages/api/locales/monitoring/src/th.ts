import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Thai. */
export const th: MonitoringTranslations = {
  'monitoring.error.noProvider': 'ยังไม่ได้กำหนดค่าผู้ให้บริการการตรวจสอบ เรียก setProvider() ก่อน',
  'monitoring.check.database.notBonded': 'ยังไม่ได้กำหนดค่าการเชื่อมต่อฐานข้อมูล',
  'monitoring.check.database.poolUnavailable': 'พูลฐานข้อมูลไม่พร้อมใช้งาน',
  'monitoring.check.cache.notBonded': 'ยังไม่ได้กำหนดค่าการเชื่อมต่อแคช',
  'monitoring.check.cache.providerUnavailable': 'ผู้ให้บริการแคชไม่พร้อมใช้งาน',
  'monitoring.check.http.badStatus': 'การตอบกลับ HTTP {{status}}',
  'monitoring.check.http.timeout': 'คำขอหมดเวลา',
  'monitoring.check.http.degraded': 'เวลาตอบสนอง {{latencyMs}}ms เกินเกณฑ์ {{thresholdMs}}ms',
  'monitoring.check.bond.notBonded': "การเชื่อมต่อ '{{bondType}}' ไม่ได้ลงทะเบียน",
  'monitoring.check.timedOut': 'การตรวจสอบหมดเวลาหลังจาก {{timeoutMs}}ms',
}
