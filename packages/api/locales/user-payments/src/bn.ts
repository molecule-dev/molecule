import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Bengali. */
export const bn: UserPaymentTranslations = {
  'user.payment.providerRequired': 'পেমেন্ট প্রদানকারী প্রয়োজন।',
  'user.payment.subscriptionIdRequired': 'subscriptionId প্রয়োজন।',
  'user.payment.receiptAndPlanRequired': 'receipt এবং planKey প্রয়োজন।',
  'user.payment.verificationNotConfigured':
    '{{provider}}-এর জন্য পেমেন্ট যাচাইকরণ কনফিগার করা হয়নি।',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'অজানা প্ল্যান।',
  'user.payment.invalidWebhookEvent': 'অবৈধ ওয়েবহুক ইভেন্ট।',
}
