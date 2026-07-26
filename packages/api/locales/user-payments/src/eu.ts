import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Basque. */
export const eu: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Ordainketa-hornitzailea beharrezkoa da.',
  'user.payment.subscriptionIdRequired': 'subscriptionId beharrezkoa da.',
  'user.payment.receiptAndPlanRequired': 'receipt eta planKey beharrezkoak dira.',
  'user.payment.verificationNotConfigured':
    'Ordainketa egiaztapena ez dago konfiguratuta {{provider}}-rako.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Plan ezezaguna.',
  'user.payment.invalidWebhookEvent': 'Webhook gertaera baliogabea.',
}
