import type { BillingTranslations } from './types.js'

/** Billing translations for pl. */
export const pl: Partial<BillingTranslations> = {
  'billing.status.loading': 'Ładowanie…',
  'billing.status.cancelCta': 'Anuluj subskrypcję',
  'billing.pricing.loading': 'Ładowanie planów…',
  'billing.pricing.error': 'Nie można załadować cen. Proszę spróbować później.',
  'billing.pricing.checkoutError': 'Nie udało się rozpocząć płatności. Proszę spróbować ponownie.',
  'billing.pricing.mostPopular': 'Najpopularniejszy',
  'billing.pricing.tierEyebrow': 'Poziom',
  'billing.pricing.upgradeCta': 'Ulepsz do {{tierName}}',
  'billing.status.currentPlan': 'Aktualny plan:<x> {{nazwa_poziomu}}</x>',
  'billing.status.cancelError': 'Nie udało się anulować. Spróbuj ponownie.',
  'billing.pricing.reassurance':
    'Anuluj w dowolnym momencie · Do rozpoczęcia nie jest wymagana karta kredytowa',
  'billing.pricing.perSeat': 'za miejsce',
}
