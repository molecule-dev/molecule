import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Galician. */
export const gl: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Requírese o provedor de pagamento.',
  'user.payment.subscriptionIdRequired': 'Requírese subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Requírense receipt e planKey.',
  'user.payment.verificationNotConfigured':
    'A verificación de pagamento non está configurada para {{provider}}.',
  'user.payment.invalidPlan': 'Plan non válido.',
  'user.payment.verificationFailed': 'Non se puido verificar a subscrición.',
  'user.payment.unknownPlan': 'Plan descoñecido.',
  'user.payment.invalidWebhookEvent': 'Evento de webhook non válido.',
}
