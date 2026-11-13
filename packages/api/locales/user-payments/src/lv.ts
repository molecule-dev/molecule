import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Latvian. */
export const lv: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Nepieciešams maksājumu nodrošinātājs.',
  'user.payment.subscriptionIdRequired': 'Nepieciešams subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Nepieciešams kvīts un planKey.',
  'user.payment.verificationNotConfigured':
    'Maksājuma verifikācija nav konfigurēta priekš {{provider}}.',
  'user.payment.invalidPlan': 'Nederīgs plāns pakalpojumam {{provider}}.',
  'user.payment.verificationFailed': 'Maksājuma verifikācija pakalpojumam {{provider}} neizdevās.',
  'user.payment.unknownPlan': 'Nezināms plāns.',
  'user.payment.invalidWebhookEvent': 'Nederīgs webhook notikums.',
}
