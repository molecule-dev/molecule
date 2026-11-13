import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Czech. */
export const cs: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Poskytovatel platby je povinný.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je povinný.',
  'user.payment.receiptAndPlanRequired': 'receipt a planKey jsou povinné.',
  'user.payment.verificationNotConfigured': 'Ověření platby není nakonfigurováno pro {{provider}}.',
  'user.payment.invalidPlan': 'Neplatný plán pro {{provider}}.',
  'user.payment.verificationFailed': 'Ověření platby pro {{provider}} se nezdařilo.',
  'user.payment.unknownPlan': 'Neznámý plán.',
  'user.payment.invalidWebhookEvent': 'Neplatná událost webhooku.',
}
