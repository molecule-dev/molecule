import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Kyrgyz. */
export const ky: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Төлөм провайдери талап кылынат.',
  'user.payment.subscriptionIdRequired': 'subscriptionId талап кылынат.',
  'user.payment.receiptAndPlanRequired': 'квитанция жана planKey талап кылынат.',
  'user.payment.verificationNotConfigured':
    '{{provider}} үчүн төлөм текшерүүсү конфигурацияланган эмес.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Белгисиз план.',
  'user.payment.invalidWebhookEvent': 'Жараксыз вебхук окуясы.',
}
