import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Filipino. */
export const fil: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Kailangan ang payment provider.',
  'user.payment.subscriptionIdRequired': 'Kailangan ang subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Kailangan ang receipt at planKey.',
  'user.payment.verificationNotConfigured':
    'Hindi naka-configure ang payment verification para sa {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Hindi kilalang plan.',
  'user.payment.invalidWebhookEvent': 'Hindi valid na webhook event.',
}
