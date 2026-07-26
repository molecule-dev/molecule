import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Slovenian. */
export const sl: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Ponudnik plačil je obvezen.',
  'user.payment.subscriptionIdRequired': 'subscriptionId je obvezen.',
  'user.payment.receiptAndPlanRequired': 'receipt in planKey sta obvezna.',
  'user.payment.verificationNotConfigured': 'Preverjanje plačila ni konfigurirano za {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Neznan paket.',
  'user.payment.invalidWebhookEvent': 'Neveljaven webhook dogodek.',
}
