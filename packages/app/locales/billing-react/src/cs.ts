import type { BillingTranslations } from './types.js'

/** Billing translations for cs. */
export const cs: Partial<BillingTranslations> = {
  'billing.status.loading': 'Načítání…',
  'billing.status.cancelCta': 'Zrušit předplatné',
  'billing.pricing.loading': 'Načítání plánů…',
  'billing.pricing.error': 'Ceny se nepodařilo načíst. Zkuste to znovu později.',
  'billing.pricing.checkoutError': 'Nepodařilo se spustit pokladnu. Zkuste to prosím znovu.',
  'billing.pricing.mostPopular': 'Nejoblíbenější',
  'billing.pricing.upgradeCta': 'Přejít na {{tierName}}',
}
