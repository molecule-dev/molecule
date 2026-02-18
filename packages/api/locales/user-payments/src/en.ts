import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for English. */
export const en: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Payment provider is required.',
  'user.payment.subscriptionIdRequired': 'subscriptionId is required.',
  'user.payment.receiptAndPlanRequired': 'receipt and planKey are required.',
  'user.payment.verificationNotConfigured':
    'Payment verification is not configured for {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Unknown plan.',
  'user.payment.invalidWebhookEvent': 'Invalid webhook event.',
}
