import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Basque. */
export const eu: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Ordainketa-hornitzailea beharrezkoa da.',
  'user.payment.subscriptionIdRequired': 'subscriptionId beharrezkoa da.',
  'user.payment.receiptAndPlanRequired': 'receipt eta planKey beharrezkoak dira.',
  'user.payment.verificationNotConfigured':
    'Ordainketa egiaztapena ez dago konfiguratuta {{provider}}-rako.',
  'user.payment.invalidPlan': 'Plan baliogabea.',
  'user.payment.verificationFailed': 'Ezin izan da harpidetza egiaztatu.',
  'user.payment.unknownPlan': 'Plan ezezaguna.',
  'user.payment.invalidWebhookEvent': 'Webhook gertaera baliogabea.',
}
