import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Turkish. */
export const tr: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Ödeme sağlayıcısı gereklidir.',
  'user.payment.subscriptionIdRequired': 'subscriptionId gereklidir.',
  'user.payment.receiptAndPlanRequired': 'receipt ve planKey gereklidir.',
  'user.payment.verificationNotConfigured':
    '{{provider}} için ödeme doğrulaması yapılandırılmamış.',
  'user.payment.invalidPlan': '{{provider}} için geçersiz plan.',
  'user.payment.verificationFailed': '{{provider}} için ödeme doğrulama başarısız oldu.',
  'user.payment.unknownPlan': 'Bilinmeyen plan.',
  'user.payment.invalidWebhookEvent': 'Geçersiz webhook olayı.',
}
