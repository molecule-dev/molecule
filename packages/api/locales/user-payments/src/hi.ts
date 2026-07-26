import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Hindi. */
export const hi: UserPaymentTranslations = {
  'user.payment.providerRequired': 'भुगतान प्रदाता आवश्यक है।',
  'user.payment.subscriptionIdRequired': 'subscriptionId आवश्यक है।',
  'user.payment.receiptAndPlanRequired': 'receipt और planKey आवश्यक हैं।',
  'user.payment.verificationNotConfigured': '{{provider}} के लिए भुगतान सत्यापन कॉन्फ़िगर नहीं है।',
  'user.payment.invalidPlan': 'अमान्य प्लान।',
  'user.payment.verificationFailed': 'सब्सक्रिप्शन सत्यापित करने में विफल।',
  'user.payment.unknownPlan': 'अज्ञात प्लान।',
  'user.payment.invalidWebhookEvent': 'अमान्य वेबहुक इवेंट।',
}
