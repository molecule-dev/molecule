import type { BillingTranslations } from './types.js'

/** Billing translations for gl. */
export const gl: Partial<BillingTranslations> = {
  'billing.status.loading': 'Cargando…',
  'billing.status.currentPlan': 'Plan actual:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Cancelar a subscrición',
  'billing.status.cancelError': 'Non se puido cancelar. Téntao de novo.',
  'billing.pricing.loading': 'Cargando planos…',
  'billing.pricing.error': 'Non se puideron cargar os prezos. Téntao de novo máis tarde.',
  'billing.pricing.checkoutError': 'Non se puido iniciar o proceso de compra. Téntao de novo.',
  'billing.pricing.reassurance':
    'Cancelar en calquera momento · Non se require tarxeta de crédito para comezar',
  'billing.pricing.mostPopular': 'Máis popular',
  'billing.pricing.tierEyebrow': 'Nivel',
  'billing.pricing.perSeat': 'por asento',
  'billing.pricing.upgradeCta': 'Actualizar a<x> {{tierName}}</x>',
}
