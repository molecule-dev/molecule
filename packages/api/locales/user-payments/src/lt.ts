import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Lithuanian. */
export const lt: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Būtinas mokėjimo teikėjas.',
  'user.payment.subscriptionIdRequired': 'Būtinas subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Būtinas kvitas ir planKey.',
  'user.payment.verificationNotConfigured':
    'Mokėjimo patvirtinimas nesukonfigūruotas {{provider}}.',
  'user.payment.invalidPlan': 'Neteisingas {{provider}} planas.',
  'user.payment.verificationFailed': 'Mokėjimo patvirtinimas naudojantis {{provider}} nepavyko.',
  'user.payment.unknownPlan': 'Nežinomas planas.',
  'user.payment.invalidWebhookEvent': 'Netinkamas webhook įvykis.',
}
