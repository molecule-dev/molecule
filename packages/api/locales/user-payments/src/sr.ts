import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Serbian. */
export const sr: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Провајдер плаћања је обавезан.',
  'user.payment.subscriptionIdRequired': 'subscriptionId је обавезан.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey су обавезни.',
  'user.payment.verificationNotConfigured':
    'Верификација плаћања није конфигурисана за {{provider}}.',
  'user.payment.invalidPlan': 'Неважећи план за {{provider}}.',
  'user.payment.verificationFailed': 'Верификација плаћања за {{provider}} није успела.',
  'user.payment.unknownPlan': 'Непознат план.',
  'user.payment.invalidWebhookEvent': 'Неважећи webhook догађај.',
}
