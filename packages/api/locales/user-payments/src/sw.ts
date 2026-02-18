import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Swahili. */
export const sw: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Mtoa huduma wa malipo anahitajika.',
  'user.payment.subscriptionIdRequired': 'subscriptionId inahitajika.',
  'user.payment.receiptAndPlanRequired': 'receipt na planKey zinahitajika.',
  'user.payment.verificationNotConfigured':
    'Uthibitishaji wa malipo haujasanidiwa kwa {{provider}}.',
  'user.payment.invalidPlan': 'Mpango batili.',
  'user.payment.verificationFailed': 'Imeshindwa kuthibitisha usajili.',
  'user.payment.unknownPlan': 'Mpango usiojulikana.',
  'user.payment.invalidWebhookEvent': 'Tukio la webhook batili.',
}
