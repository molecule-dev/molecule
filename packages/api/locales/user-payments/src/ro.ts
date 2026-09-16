import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Romanian. */
export const ro: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Furnizorul de plată este obligatoriu.',
  'user.payment.subscriptionIdRequired': 'subscriptionId este obligatoriu.',
  'user.payment.receiptAndPlanRequired': 'receipt și planKey sunt obligatorii.',
  'user.payment.verificationNotConfigured':
    'Verificarea plății nu este configurată pentru {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Plan necunoscut.',
  'user.payment.invalidWebhookEvent': 'Eveniment webhook invalid.',
}
