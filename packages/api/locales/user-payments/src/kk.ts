import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Kazakh. */
export const kk: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Төлем провайдері қажет.',
  'user.payment.subscriptionIdRequired': 'subscriptionId қажет.',
  'user.payment.receiptAndPlanRequired': 'receipt және planKey қажет.',
  'user.payment.verificationNotConfigured':
    '{{provider}} үшін төлем тексеруі конфигурацияланбаған.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Белгісіз жоспар.',
  'user.payment.invalidWebhookEvent': 'Жарамсыз вебхук оқиғасы.',
}
