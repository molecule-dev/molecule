import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Galician. */
export const gl: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Requírese o provedor de pagamento.',
  'user.payment.subscriptionIdRequired': 'Requírese subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Requírense receipt e planKey.',
  'user.payment.verificationNotConfigured':
    'A verificación de pagamento non está configurada para {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Plan descoñecido.',
  'user.payment.invalidWebhookEvent': 'Evento de webhook non válido.',
}
