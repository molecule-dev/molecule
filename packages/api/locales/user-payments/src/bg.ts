import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Bulgarian. */
export const bg: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Доставчикът на плащане е задължителен.',
  'user.payment.subscriptionIdRequired': 'subscriptionId е задължителен.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey са задължителни.',
  'user.payment.verificationNotConfigured':
    'Верификацията на плащането не е конфигурирана за {{provider}}.',
  'user.payment.invalidPlan': 'Невалиден план за {{provider}}.',
  'user.payment.verificationFailed': 'Потвърждаването на плащането за {{provider}} не бе успешно.',
  'user.payment.unknownPlan': 'Неизвестен план.',
  'user.payment.invalidWebhookEvent': 'Невалидно уебхук събитие.',
}
