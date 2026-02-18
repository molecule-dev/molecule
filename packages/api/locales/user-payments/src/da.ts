import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Danish. */
export const da: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Betalingsudbyder er påkrævet.',
  'user.payment.subscriptionIdRequired': 'subscriptionId er påkrævet.',
  'user.payment.receiptAndPlanRequired': 'kvittering og planKey er påkrævet.',
  'user.payment.verificationNotConfigured':
    'Betalingsverifikation er ikke konfigureret for {{provider}}.',
  'user.payment.invalidPlan': 'Ugyldig plan.',
  'user.payment.verificationFailed': 'Kunne ikke verificere abonnement.',
  'user.payment.unknownPlan': 'Ukendt plan.',
  'user.payment.invalidWebhookEvent': 'Ugyldig webhook-hændelse.',
}
