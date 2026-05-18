import type { BillingTranslations } from './types.js'

/** Billing translations for eu. */
export const eu: Partial<BillingTranslations> = {
  'billing.status.loading': 'Kargatzen…',
  'billing.status.currentPlan': 'Uneko plana:<x> {{mailaIzena}}</x>',
  'billing.status.cancelCta': 'Harpidetza bertan behera utzi',
  'billing.status.cancelError': 'Ezin izan da bertan behera utzi. Saiatu berriro.',
  'billing.pricing.loading': 'Planak kargatzen…',
  'billing.pricing.error': 'Ezin izan dira prezioak kargatu. Saiatu berriro geroago.',
  'billing.pricing.checkoutError': 'Ezin izan da ordainketa hasi. Saiatu berriro.',
  'billing.pricing.reassurance':
    'Edozein unetan bertan behera utzi · Ez da kreditu txartelik behar hasteko',
  'billing.pricing.mostPopular': 'Ezagunenak',
  'billing.pricing.tierEyebrow': 'Maila',
  'billing.pricing.perSeat': 'eserleku bakoitzeko',
  'billing.pricing.upgradeCta': 'Berritu honetara<x> {{mailaIzena}}</x>',
}
