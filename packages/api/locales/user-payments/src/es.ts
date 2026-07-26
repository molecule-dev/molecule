import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Spanish. */
export const es: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Se requiere el proveedor de pago.',
  'user.payment.subscriptionIdRequired': 'Se requiere subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Se requieren receipt y planKey.',
  'user.payment.verificationNotConfigured':
    'La verificación de pago no está configurada para {{provider}}.',
  'user.payment.invalidPlan': 'Plan no válido.',
  'user.payment.verificationFailed': 'No se pudo verificar la suscripción.',
  'user.payment.unknownPlan': 'Plan desconocido.',
  'user.payment.invalidWebhookEvent': 'Evento de webhook no válido.',
}
