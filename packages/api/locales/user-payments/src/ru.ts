import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Russian. */
export const ru: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Платёжный провайдер обязателен.',
  'user.payment.subscriptionIdRequired': 'subscriptionId обязателен.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey обязательны.',
  'user.payment.verificationNotConfigured': 'Верификация платежа не настроена для {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Неизвестный план.',
  'user.payment.invalidWebhookEvent': 'Недопустимое событие вебхука.',
}
