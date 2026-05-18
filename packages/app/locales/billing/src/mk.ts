import type { BillingTranslations } from './types.js'

/** Billing translations for mk. */
export const mk: Partial<BillingTranslations> = {
  'billing.status.loading': 'Се вчитува…',
  'billing.status.currentPlan': 'Тековен план:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Откажи претплата',
  'billing.status.cancelError': 'Не може да се откаже. Обидете се повторно.',
  'billing.pricing.loading': 'Се вчитуваат планови…',
  'billing.pricing.error': 'Не може да се вчитаат цените. Обидете се повторно подоцна.',
  'billing.pricing.checkoutError': 'Не може да се започне со наплата. Обидете се повторно.',
  'billing.pricing.reassurance':
    'Откажи во секое време · Не е потребна кредитна картичка за почеток',
  'billing.pricing.mostPopular': 'Најпопуларни',
  'billing.pricing.tierEyebrow': 'Ниво',
  'billing.pricing.perSeat': 'по седиште',
  'billing.pricing.upgradeCta': 'Надгради на<x> {{tierName}}</x>',
}
