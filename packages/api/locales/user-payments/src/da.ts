import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Danish. */
export const da: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Betalingsudbyder er påkrævet.',
  'user.payment.subscriptionIdRequired': 'subscriptionId er påkrævet.',
  'user.payment.receiptAndPlanRequired': 'kvittering og planKey er påkrævet.',
  'user.payment.verificationNotConfigured':
    'Betalingsverifikation er ikke konfigureret for {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Ukendt plan.',
  'user.payment.invalidWebhookEvent': 'Ugyldig webhook-hændelse.',
}
