import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Ukrainian. */
export const uk: UserPaymentTranslations = {
  'user.payment.providerRequired': "Платіжний провайдер є обов'язковим.",
  'user.payment.subscriptionIdRequired': "subscriptionId є обов'язковим.",
  'user.payment.receiptAndPlanRequired': "receipt та planKey є обов'язковими.",
  'user.payment.verificationNotConfigured': 'Верифікація платежу не налаштована для {{provider}}.',
  'user.payment.invalidPlan': 'Недійсний план для {{provider}}.',
  'user.payment.verificationFailed': 'Не вдалося перевірити оплату для {{provider}}.',
  'user.payment.unknownPlan': 'Невідомий план.',
  'user.payment.invalidWebhookEvent': 'Недійсна подія вебхука.',
}
