import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Catalan. */
export const ca: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Es requereix el proveïdor de pagament.',
  'user.payment.subscriptionIdRequired': 'Es requereix subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Es requereixen receipt i planKey.',
  'user.payment.verificationNotConfigured':
    'La verificació de pagament no està configurada per a {{provider}}.',
  'user.payment.invalidPlan': 'Pla no vàlid per a {{provider}}.',
  'user.payment.verificationFailed': 'La verificació del pagament ha fallat per a {{provider}}.',
  'user.payment.unknownPlan': 'Pla desconegut.',
  'user.payment.invalidWebhookEvent': 'Esdeveniment de webhook no vàlid.',
}
