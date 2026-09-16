import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Italian. */
export const it: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Il fornitore di pagamento è obbligatorio.',
  'user.payment.subscriptionIdRequired': 'subscriptionId è obbligatorio.',
  'user.payment.receiptAndPlanRequired': 'receipt e planKey sono obbligatori.',
  'user.payment.verificationNotConfigured':
    'La verifica del pagamento non è configurata per {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Piano sconosciuto.',
  'user.payment.invalidWebhookEvent': 'Evento webhook non valido.',
}
