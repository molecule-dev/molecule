import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Arabic. */
export const ar: UserPaymentTranslations = {
  'user.payment.providerRequired': 'مزود الدفع مطلوب.',
  'user.payment.subscriptionIdRequired': 'مطلوب subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'مطلوب receipt و planKey.',
  'user.payment.verificationNotConfigured': 'لم يتم تكوين التحقق من الدفع لـ {{provider}}.',
  'user.payment.invalidPlan': 'خطة غير صالحة.',
  'user.payment.verificationFailed': 'فشل التحقق من الاشتراك.',
  'user.payment.unknownPlan': 'خطة غير معروفة.',
  'user.payment.invalidWebhookEvent': 'حدث خطاف غير صالح.',
}
