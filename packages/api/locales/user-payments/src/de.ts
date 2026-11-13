import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for German. */
export const de: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Zahlungsanbieter ist erforderlich.',
  'user.payment.subscriptionIdRequired': 'subscriptionId ist erforderlich.',
  'user.payment.receiptAndPlanRequired': 'Quittung und planKey sind erforderlich.',
  'user.payment.verificationNotConfigured':
    'Zahlungsverifizierung ist nicht für {{provider}} konfiguriert.',
  'user.payment.invalidPlan': 'Ungültiger Tarif für {{provider}}.',
  'user.payment.verificationFailed': 'Die Zahlungsprüfung für {{provider}} ist fehlgeschlagen.',
  'user.payment.unknownPlan': 'Unbekannter Tarif.',
  'user.payment.invalidWebhookEvent': 'Ungültiges Webhook-Ereignis.',
}
