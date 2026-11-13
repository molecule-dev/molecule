import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Maltese. */
export const mt: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Il-fornitur tal-pagament mehtieg.',
  'user.payment.subscriptionIdRequired': 'subscriptionId mehtieg.',
  'user.payment.receiptAndPlanRequired': 'receipt u planKey mehtieghin.',
  'user.payment.verificationNotConfigured':
    'Il-verifika tal-pagament mhijiex konfigurata ghal {{provider}}.',
  'user.payment.invalidPlan': 'Pjan mhux validu għal {{provider}}.',
  'user.payment.verificationFailed': 'Il-verifika tal-ħlas falliet għal {{provider}}.',
  'user.payment.unknownPlan': 'Pjan mhux maghruf.',
  'user.payment.invalidWebhookEvent': 'Avveniment webhook invalidu.',
}
