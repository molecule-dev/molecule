import type { BillingTranslations } from './types.js'

/** Billing translations for de. */
export const de: Partial<BillingTranslations> = {
  'billing.status.loading': 'Wird geladen…',
  'billing.status.cancelCta': 'Abonnement kündigen',
  'billing.pricing.loading': 'Tarife werden geladen…',
  'billing.pricing.error': 'Preise konnten nicht geladen werden. Versuchen Sie es später erneut.',
  'billing.pricing.checkoutError': 'Kasse konnte nicht gestartet werden. Bitte erneut versuchen.',
  'billing.pricing.mostPopular': 'Am beliebtesten',
  'billing.pricing.tierEyebrow': 'Stufe',
  'billing.pricing.upgradeCta': 'Auf {{tierName}} upgraden',
}
