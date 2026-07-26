import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Uzbek. */
export const uz: UserPaymentTranslations = {
  'user.payment.providerRequired': "To'lov provayderi talab qilinadi.",
  'user.payment.subscriptionIdRequired': 'subscriptionId talab qilinadi.',
  'user.payment.receiptAndPlanRequired': 'receipt va planKey talab qilinadi.',
  'user.payment.verificationNotConfigured': "{{provider}} uchun to'lov tekshiruvi sozlanmagan.",
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': "Noma'lum reja.",
  'user.payment.invalidWebhookEvent': "Noto'g'ri webhook hodisasi.",
}
