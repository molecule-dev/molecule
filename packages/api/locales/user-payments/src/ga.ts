import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Irish. */
export const ga: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Tá soláthraí íocaíochta ag teastáil.',
  'user.payment.subscriptionIdRequired': 'Tá subscriptionId ag teastáil.',
  'user.payment.receiptAndPlanRequired': 'Tá admháil agus planKey ag teastáil.',
  'user.payment.verificationNotConfigured': 'Níl fíorú íocaíochta cumraithe do {{provider}}.',
  'user.payment.invalidPlan': 'Plean neamhbhailí do {{provider}}.',
  'user.payment.verificationFailed': 'Theip ar fhíorú íocaíochta do {{provider}}.',
  'user.payment.unknownPlan': 'Plean anaithnid.',
  'user.payment.invalidWebhookEvent': 'Imeacht webhook neamhbhailí.',
}
