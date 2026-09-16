import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Albanian. */
export const sq: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Kerkohet ofruesi i pageses.',
  'user.payment.subscriptionIdRequired': 'Kerkohet subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Kerkohet fatue dhe planKey.',
  'user.payment.verificationNotConfigured':
    'Verifikimi i pageses nuk eshte konfiguruar per {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Plan i panjohur.',
  'user.payment.invalidWebhookEvent': 'Ngjarje webhook e pavlefshme.',
}
