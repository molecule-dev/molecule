import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Hungarian. */
export const hu: UserPaymentTranslations = {
  'user.payment.providerRequired': 'A fizetési szolgáltató megadása kötelező.',
  'user.payment.subscriptionIdRequired': 'A subscriptionId megadása kötelező.',
  'user.payment.receiptAndPlanRequired': 'A nyugta és a planKey megadása kötelező.',
  'user.payment.verificationNotConfigured':
    'A fizetés ellenőrzés nincs konfigurálva a következőhöz: {{provider}}.',
  'user.payment.invalidPlan': 'Érvénytelen csomag.',
  'user.payment.verificationFailed': 'Az előfizetés ellenőrzése sikertelen.',
  'user.payment.unknownPlan': 'Ismeretlen csomag.',
  'user.payment.invalidWebhookEvent': 'Érvénytelen webhook esemény.',
}
