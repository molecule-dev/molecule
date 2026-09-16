import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Zulu. */
export const zu: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Umhlinzeki wokukhokha uyadingeka.',
  'user.payment.subscriptionIdRequired': 'i-subscriptionId iyadingeka.',
  'user.payment.receiptAndPlanRequired': 'i-receipt ne-planKey ziyadingeka.',
  'user.payment.verificationNotConfigured':
    'Ukuqinisekiswa kokukhokha akumisekanga nge-{{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Uhlelo olungaziwa.',
  'user.payment.invalidWebhookEvent': 'Isenzakalo se-webhook esingavumelekile.',
}
