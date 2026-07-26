import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Thai. */
export const th: UserPaymentTranslations = {
  'user.payment.providerRequired': 'ต้องระบุผู้ให้บริการชำระเงิน',
  'user.payment.subscriptionIdRequired': 'ต้องระบุ subscriptionId',
  'user.payment.receiptAndPlanRequired': 'ต้องระบุ receipt และ planKey',
  'user.payment.verificationNotConfigured':
    'ยังไม่ได้กำหนดค่าการยืนยันการชำระเงินสำหรับ {{provider}}',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'แผนที่ไม่รู้จัก',
  'user.payment.invalidWebhookEvent': 'เหตุการณ์ webhook ไม่ถูกต้อง',
}
