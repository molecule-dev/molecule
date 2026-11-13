import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Polish. */
export const pl: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Dostawca płatności jest wymagany.',
  'user.payment.subscriptionIdRequired': 'subscriptionId jest wymagane.',
  'user.payment.receiptAndPlanRequired': 'receipt i planKey są wymagane.',
  'user.payment.verificationNotConfigured':
    'Weryfikacja płatności nie jest skonfigurowana dla {{provider}}.',
  'user.payment.invalidPlan': 'Nieprawidłowy plan dla {{provider}}.',
  'user.payment.verificationFailed': 'Weryfikacja płatności nie powiodła się dla {{provider}}.',
  'user.payment.unknownPlan': 'Nieznany plan.',
  'user.payment.invalidWebhookEvent': 'Nieprawidłowe zdarzenie webhooka.',
}
