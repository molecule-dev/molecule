import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Slovak. */
export const sk: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Poskytovateľ platby je povinný.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je povinný.',
  'user.payment.receiptAndPlanRequired': 'receipt a planKey sú povinné.',
  'user.payment.verificationNotConfigured':
    'Overenie platby nie je nakonfigurované pre {{provider}}.',
  'user.payment.invalidPlan': 'Neplatný plán.',
  'user.payment.verificationFailed': 'Overenie predplatného zlyhalo.',
  'user.payment.unknownPlan': 'Neznámy plán.',
  'user.payment.invalidWebhookEvent': 'Neplatná udalosť webhooku.',
}
