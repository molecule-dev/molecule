import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Afrikaans. */
export const af: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Betalingsverskaffer word vereis.',
  'user.payment.subscriptionIdRequired': 'subscriptionId word vereis.',
  'user.payment.receiptAndPlanRequired': 'kwitansie en planKey word vereis.',
  'user.payment.verificationNotConfigured':
    'Betalingsverifikasie is nie opgestel vir {{provider}} nie.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Onbekende plan.',
  'user.payment.invalidWebhookEvent': 'Ongeldige webhook-gebeurtenis.',
}
