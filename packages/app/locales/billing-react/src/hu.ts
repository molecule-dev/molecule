import type { BillingTranslations } from './types.js'

/** Billing translations for hu. */
export const hu: Partial<BillingTranslations> = {
  'billing.status.loading': 'Betöltés…',
  'billing.status.cancelCta': 'Előfizetés lemondása',
  'billing.pricing.loading': 'Csomagok betöltése…',
  'billing.pricing.error': 'Az árak betöltése nem sikerült. Próbálja újra később.',
  'billing.pricing.checkoutError': 'Nem sikerült elindítani a pénztárat. Kérjük, próbálja újra.',
  'billing.pricing.mostPopular': 'Legnépszerűbb',
  'billing.pricing.upgradeCta': 'Váltás: {{tierName}}',
}
