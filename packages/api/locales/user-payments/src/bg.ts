import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Bulgarian. */
export const bg: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Доставчикът на плащане е задължителен.',
  'user.payment.subscriptionIdRequired': 'subscriptionId е задължителен.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey са задължителни.',
  'user.payment.verificationNotConfigured':
    'Верификацията на плащането не е конфигурирана за {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Неизвестен план.',
  'user.payment.invalidWebhookEvent': 'Невалидно уебхук събитие.',
}
