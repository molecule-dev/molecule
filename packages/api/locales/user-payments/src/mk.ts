import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Macedonian. */
export const mk: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Потребен е давател на плаќање.',
  'user.payment.subscriptionIdRequired': 'subscriptionId е задолжителен.',
  'user.payment.receiptAndPlanRequired': 'receipt и planKey се задолжителни.',
  'user.payment.verificationNotConfigured':
    'Верификацијата на плаќањето не е конфигурирана за {{provider}}.',
  'user.payment.invalidPlan': 'Невалиден план.',
  'user.payment.verificationFailed': 'Верификацијата на претплатата не успеа.',
  'user.payment.unknownPlan': 'Непознат план.',
  'user.payment.invalidWebhookEvent': 'Невалиден веб-кука настан.',
}
