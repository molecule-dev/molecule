import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Serbian. */
export const sr: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Провајдер плаћања је обавезан.',
  'user.payment.subscriptionIdRequired': 'subscriptionId је обавезан.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey су обавезни.',
  'user.payment.verificationNotConfigured':
    'Верификација плаћања није конфигурисана за {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Непознат план.',
  'user.payment.invalidWebhookEvent': 'Неважећи webhook догађај.',
}
