import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Marathi. */
export const mr: UserPaymentTranslations = {
  'user.payment.providerRequired': 'पेमेंट प्रदाता आवश्यक आहे.',
  'user.payment.subscriptionIdRequired': 'subscriptionId आवश्यक आहे.',
  'user.payment.receiptAndPlanRequired': 'receipt आणि planKey आवश्यक आहेत.',
  'user.payment.verificationNotConfigured':
    '{{provider}} साठी पेमेंट सत्यापन कॉन्फिगर केलेले नाही.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'अज्ञात प्लॅन.',
  'user.payment.invalidWebhookEvent': 'अवैध वेबहुक इव्हेंट.',
}
