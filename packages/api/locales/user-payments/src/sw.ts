import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Swahili. */
export const sw: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Mtoa huduma wa malipo anahitajika.',
  'user.payment.subscriptionIdRequired': 'subscriptionId inahitajika.',
  'user.payment.receiptAndPlanRequired': 'receipt na planKey zinahitajika.',
  'user.payment.verificationNotConfigured':
    'Uthibitishaji wa malipo haujasanidiwa kwa {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Mpango usiojulikana.',
  'user.payment.invalidWebhookEvent': 'Tukio la webhook batili.',
}
