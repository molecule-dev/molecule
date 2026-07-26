import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for French. */
export const fr: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Le fournisseur de paiement est requis.',
  'user.payment.subscriptionIdRequired': 'subscriptionId est requis.',
  'user.payment.receiptAndPlanRequired': 'receipt et planKey sont requis.',
  'user.payment.verificationNotConfigured':
    "La vérification de paiement n'est pas configurée pour {{provider}}.",
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Plan inconnu.',
  'user.payment.invalidWebhookEvent': 'Événement webhook invalide.',
}
