import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Slovak. */
export const sk: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Poskytovateľ platby je povinný.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je povinný.',
  'user.payment.receiptAndPlanRequired': 'receipt a planKey sú povinné.',
  'user.payment.verificationNotConfigured':
    'Overenie platby nie je nakonfigurované pre {{provider}}.',
  'user.payment.invalidPlan': 'Neplatný plán pre {{provider}}.',
  'user.payment.verificationFailed': 'Overenie platby pre {{provider}} zlyhalo.',
  'user.payment.unknownPlan': 'Neznámy plán.',
  'user.payment.invalidWebhookEvent': 'Neplatná udalosť webhooku.',
}
