import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Zulu. */
export const zu: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Umhlinzeki wokukhokha uyadingeka.',
  'user.payment.subscriptionIdRequired': 'i-subscriptionId iyadingeka.',
  'user.payment.receiptAndPlanRequired': 'i-receipt ne-planKey ziyadingeka.',
  'user.payment.verificationNotConfigured':
    'Ukuqinisekiswa kokukhokha akumisekanga nge-{{provider}}.',
  'user.payment.invalidPlan': 'Uhlelo olungavumelekile luka {{provider}}.',
  'user.payment.verificationFailed': 'Ukuqinisekiswa kwenkokhelo kwehlulekile ku {{provider}}.',
  'user.payment.unknownPlan': 'Uhlelo olungaziwa.',
  'user.payment.invalidWebhookEvent': 'Isenzakalo se-webhook esingavumelekile.',
}
