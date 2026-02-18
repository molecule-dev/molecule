import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Dutch. */
export const nl: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Betalingsprovider is vereist.',
  'user.payment.subscriptionIdRequired': 'subscriptionId is vereist.',
  'user.payment.receiptAndPlanRequired': 'bon en planKey zijn vereist.',
  'user.payment.verificationNotConfigured':
    'Betalingsverificatie is niet geconfigureerd voor {{provider}}.',
  'user.payment.invalidPlan': 'Ongeldig plan.',
  'user.payment.verificationFailed': 'Kon abonnement niet verifiëren.',
  'user.payment.unknownPlan': 'Onbekend plan.',
  'user.payment.invalidWebhookEvent': 'Ongeldig webhook-evenement.',
}
