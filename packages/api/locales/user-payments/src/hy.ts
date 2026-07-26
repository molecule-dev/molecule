import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Armenian. */
export const hy: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Vcharvogi matakararny pahanjvum e.',
  'user.payment.subscriptionIdRequired': 'subscriptionId pahanjvum e.',
  'user.payment.receiptAndPlanRequired': 'receipt ev planKey pahanjvum en.',
  'user.payment.verificationNotConfigured':
    'Vcharvogi stugumny kargavorvac che {{provider}}-i hamar.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Anhayt plan.',
  'user.payment.invalidWebhookEvent': 'Anvaverakan webhook iradarcutyun.',
}
