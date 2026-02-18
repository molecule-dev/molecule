import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Icelandic. */
export const is: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Greiðsluveita er nauðsynleg.',
  'user.payment.subscriptionIdRequired': 'subscriptionId er nauðsynlegt.',
  'user.payment.receiptAndPlanRequired': 'kvittun og planKey eru nauðsynleg.',
  'user.payment.verificationNotConfigured':
    'Greiðslustaðfesting er ekki stillt fyrir {{provider}}.',
  'user.payment.invalidPlan': 'Ógild áætlun.',
  'user.payment.verificationFailed': 'Mistókst að staðfesta áskrift.',
  'user.payment.unknownPlan': 'Óþekkt áætlun.',
  'user.payment.invalidWebhookEvent': 'Ógilt vefkrókaatvik.',
}
