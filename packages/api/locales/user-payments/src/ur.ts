import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Urdu. */
export const ur: UserPaymentTranslations = {
  'user.payment.providerRequired': 'ادائیگی فراہم کنندہ درکار ہے۔',
  'user.payment.subscriptionIdRequired': 'subscriptionId درکار ہے۔',
  'user.payment.receiptAndPlanRequired': 'receipt اور planKey درکار ہیں۔',
  'user.payment.verificationNotConfigured': '{{provider}} کے لیے ادائیگی کی تصدیق کنفیگر نہیں ہے۔',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'نامعلوم پلان۔',
  'user.payment.invalidWebhookEvent': 'غلط ویب ہک ایونٹ۔',
}
