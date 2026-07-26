import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Turkish. */
export const tr: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Ödeme sağlayıcısı gereklidir.',
  'user.payment.subscriptionIdRequired': 'subscriptionId gereklidir.',
  'user.payment.receiptAndPlanRequired': 'receipt ve planKey gereklidir.',
  'user.payment.verificationNotConfigured':
    '{{provider}} için ödeme doğrulaması yapılandırılmamış.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Bilinmeyen plan.',
  'user.payment.invalidWebhookEvent': 'Geçersiz webhook olayı.',
}
