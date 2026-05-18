import type { BillingTranslations } from './types.js'

/** Billing translations for th. */
export const th: Partial<BillingTranslations> = {
  'billing.status.loading': 'กำลังโหลด…',
  'billing.status.currentPlan': 'แผนปัจจุบัน:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'ยกเลิกการสมัครสมาชิก',
  'billing.status.cancelError': 'ไม่สามารถยกเลิกได้ โปรดลองอีกครั้ง',
  'billing.pricing.loading': 'กำลังโหลดแผน…',
  'billing.pricing.error': 'ไม่สามารถโหลดข้อมูลราคาได้ โปรดลองใหม่อีกครั้งภายหลัง',
  'billing.pricing.checkoutError': 'ไม่สามารถเริ่มขั้นตอนการชำระเงินได้ โปรดลองอีกครั้ง',
  'billing.pricing.reassurance': 'ยกเลิกได้ทุกเมื่อ · ไม่ต้องใช้บัตรเครดิตในการเริ่มต้นใช้งาน',
  'billing.pricing.mostPopular': 'ยอดนิยมที่สุด',
  'billing.pricing.tierEyebrow': 'ชั้น',
  'billing.pricing.perSeat': 'ต่อที่นั่ง',
  'billing.pricing.upgradeCta': 'อัปเกรดเป็น<x> {{tierName}}</x>',
}
