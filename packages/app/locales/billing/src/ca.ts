import type { BillingTranslations } from './types.js'

/** Billing translations for ca. */
export const ca: Partial<BillingTranslations> = {
  'billing.status.loading': 'S&#39;està carregant…',
  'billing.status.currentPlan': 'Pla actual:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Cancel·la la subscripció',
  'billing.status.cancelError': 'No s&#39;ha pogut cancel·lar. Torna-ho a provar.',
  'billing.pricing.loading': 'S&#39;estan carregant els plans…',
  'billing.pricing.error': 'No s&#39;han pogut carregar els preus. Torna-ho a provar més tard.',
  'billing.pricing.checkoutError':
    'No s&#39;ha pogut iniciar el procés de compra. Torna-ho a provar.',
  'billing.pricing.reassurance':
    'Cancel·la en qualsevol moment · No cal targeta de crèdit per començar',
  'billing.pricing.mostPopular': 'Més popular',
  'billing.pricing.tierEyebrow': 'Nivell',
  'billing.pricing.perSeat': 'per seient',
  'billing.pricing.upgradeCta': 'Actualitza a<x> {{tierName}}</x>',
}
