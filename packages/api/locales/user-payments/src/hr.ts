import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Croatian. */
export const hr: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Pružatelj plaćanja je obavezan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je obavezan.',
  'user.payment.receiptAndPlanRequired': 'receipt i planKey su obavezni.',
  'user.payment.verificationNotConfigured':
    'Verifikacija plaćanja nije konfigurirana za {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Nepoznat plan.',
  'user.payment.invalidWebhookEvent': 'Nevažeći webhook događaj.',
}
