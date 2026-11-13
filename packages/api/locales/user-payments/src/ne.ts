import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Nepali. */
export const ne: UserPaymentTranslations = {
  'user.payment.providerRequired': 'भुक्तानी प्रदायक आवश्यक छ।',
  'user.payment.subscriptionIdRequired': 'subscriptionId आवश्यक छ।',
  'user.payment.receiptAndPlanRequired': 'receipt र planKey आवश्यक छन्।',
  'user.payment.verificationNotConfigured':
    '{{provider}} को लागि भुक्तानी प्रमाणीकरण कन्फिगर गरिएको छैन।',
  'user.payment.invalidPlan': '{{provider}} को लागि अमान्य योजना।',
  'user.payment.verificationFailed': '{{provider}} को लागि भुक्तानी प्रमाणीकरण असफल भयो।',
  'user.payment.unknownPlan': 'अज्ञात योजना।',
  'user.payment.invalidWebhookEvent': 'अमान्य वेबहुक इभेन्ट।',
}
