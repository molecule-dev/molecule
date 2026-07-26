import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Swedish. */
export const sv: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Betalningsleverantör krävs.',
  'user.payment.subscriptionIdRequired': 'subscriptionId krävs.',
  'user.payment.receiptAndPlanRequired': 'kvitto och planKey krävs.',
  'user.payment.verificationNotConfigured':
    'Betalningsverifiering är inte konfigurerad för {{provider}}.',
  'user.payment.invalidPlan': 'Ogiltig plan.',
  'user.payment.verificationFailed': 'Kunde inte verifiera abonnemang.',
  'user.payment.unknownPlan': 'Okänd plan.',
  'user.payment.invalidWebhookEvent': 'Ogiltig webhook-händelse.',
}
