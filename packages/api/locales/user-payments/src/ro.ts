import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Romanian. */
export const ro: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Furnizorul de plată este obligatoriu.',
  'user.payment.subscriptionIdRequired': 'subscriptionId este obligatoriu.',
  'user.payment.receiptAndPlanRequired': 'receipt și planKey sunt obligatorii.',
  'user.payment.verificationNotConfigured':
    'Verificarea plății nu este configurată pentru {{provider}}.',
  'user.payment.invalidPlan': 'Plan invalid.',
  'user.payment.verificationFailed': 'Nu s-a putut verifica abonamentul.',
  'user.payment.unknownPlan': 'Plan necunoscut.',
  'user.payment.invalidWebhookEvent': 'Eveniment webhook invalid.',
}
