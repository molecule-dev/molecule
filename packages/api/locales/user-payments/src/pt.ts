import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Portuguese. */
export const pt: UserPaymentTranslations = {
  'user.payment.providerRequired': 'O fornecedor de pagamento é obrigatório.',
  'user.payment.subscriptionIdRequired': 'subscriptionId é obrigatório.',
  'user.payment.receiptAndPlanRequired': 'receipt e planKey são obrigatórios.',
  'user.payment.verificationNotConfigured':
    'A verificação de pagamento não está configurada para {{provider}}.',
  'user.payment.invalidPlan': 'Plano inválido.',
  'user.payment.verificationFailed': 'Não foi possível verificar a subscrição.',
  'user.payment.unknownPlan': 'Plano desconhecido.',
  'user.payment.invalidWebhookEvent': 'Evento de webhook inválido.',
}
