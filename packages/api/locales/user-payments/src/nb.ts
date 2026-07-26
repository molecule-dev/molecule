import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Norwegian Bokmål. */
export const nb: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Betalingsleverandør er påkrevd.',
  'user.payment.subscriptionIdRequired': 'subscriptionId er påkrevd.',
  'user.payment.receiptAndPlanRequired': 'kvittering og planKey er påkrevd.',
  'user.payment.verificationNotConfigured':
    'Betalingsverifisering er ikke konfigurert for {{provider}}.',
  'user.payment.invalidPlan': 'Ugyldig plan.',
  'user.payment.verificationFailed': 'Kunne ikke verifisere abonnement.',
  'user.payment.unknownPlan': 'Ukjent plan.',
  'user.payment.invalidWebhookEvent': 'Ugyldig webhook-hendelse.',
}
