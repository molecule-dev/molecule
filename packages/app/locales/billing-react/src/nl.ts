import type { BillingTranslations } from './types.js'

/** Billing translations for nl. */
export const nl: Partial<BillingTranslations> = {
  'billing.status.loading': 'Laden…',
  'billing.status.cancelCta': 'Abonnement opzeggen',
  'billing.pricing.loading': 'Abonnementen laden…',
  'billing.pricing.error': 'Prijzen konden niet worden geladen. Probeer het later opnieuw.',
  'billing.pricing.checkoutError': 'Kon afrekenen niet starten. Probeer opnieuw.',
  'billing.pricing.mostPopular': 'Meest populair',
  'billing.pricing.tierEyebrow': 'Niveau',
  'billing.pricing.upgradeCta': 'Upgrade naar {{tierName}}',
}
