import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Telugu. */
export const te: UserPaymentTranslations = {
  'user.payment.providerRequired': 'చెల్లింపు ప్రొవైడర్ అవసరం.',
  'user.payment.subscriptionIdRequired': 'subscriptionId అవసరం.',
  'user.payment.receiptAndPlanRequired': 'receipt మరియు planKey అవసరం.',
  'user.payment.verificationNotConfigured':
    '{{provider}} కోసం చెల్లింపు ధృవీకరణ కాన్ఫిగర్ చేయబడలేదు.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'తెలియని ప్లాన్.',
  'user.payment.invalidWebhookEvent': 'చెల్లని వెబ్‌హుక్ ఈవెంట్.',
}
