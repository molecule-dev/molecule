import type { BillingTranslations } from './types.js'

/** Billing translations for zu. */
export const zu: Partial<BillingTranslations> = {
  'billing.status.loading': 'Iyalayisha…',
  'billing.status.currentPlan': 'Uhlelo lwamanje:<x> {{igama le-tier}}</x>',
  'billing.status.cancelCta': 'Khansela okubhalisele',
  'billing.status.cancelError': 'Ayikwazanga ukukhansela. Sicela uzame futhi.',
  'billing.pricing.loading': 'Ilayisha izinhlelo…',
  'billing.pricing.error': 'Ayikwazanga ukulayisha amanani. Zama futhi kamuva.',
  'billing.pricing.checkoutError': 'Ayikwazanga ukuqala ukukhokha. Sicela uzame futhi.',
  'billing.pricing.reassurance':
    'Khansela noma nini · Akukho khadi lesikweletu elidingekayo ukuze uqale',
  'billing.pricing.mostPopular': 'Okudumile kakhulu',
  'billing.pricing.tierEyebrow': 'Izinga',
  'billing.pricing.perSeat': 'ngesihlalo ngasinye',
  'billing.pricing.upgradeCta': 'Thuthukela ku-<x> {{igama le-tier}}</x>',
}
