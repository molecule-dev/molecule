import type { BillingTranslations } from './types.js'

/** Billing translations for da. */
export const da: Partial<BillingTranslations> = {
  'billing.status.loading': 'Indlæser…',
  'billing.status.cancelCta': 'Annuller abonnement',
  'billing.pricing.loading': 'Indlæser planer…',
  'billing.pricing.error': 'Kunne ikke indlæse priser. Prøv igen senere.',
  'billing.pricing.checkoutError': 'Kunne ikke starte betaling. Prøv venligst igen.',
  'billing.pricing.mostPopular': 'Mest populær',
  'billing.pricing.upgradeCta': 'Opgrader til {{tierName}}',
}
