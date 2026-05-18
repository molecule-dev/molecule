import type { BillingTranslations } from './types.js'

/** Billing translations for es. */
export const es: Partial<BillingTranslations> = {
  'billing.status.loading': 'Cargando…',
  'billing.status.cancelCta': 'Cancelar suscripción',
  'billing.pricing.loading': 'Cargando planes…',
  'billing.pricing.error': 'No se pudieron cargar los precios. Inténtalo más tarde.',
  'billing.pricing.checkoutError': 'No se pudo iniciar el pago. Inténtalo de nuevo.',
  'billing.pricing.mostPopular': 'Más popular',
  'billing.pricing.tierEyebrow': 'Nivel',
  'billing.pricing.upgradeCta': 'Actualiza a {{tierName}}',
  'billing.status.currentPlan': 'Plan actual:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'No se pudo cancelar. Inténtalo de nuevo.',
  'billing.pricing.reassurance':
    'Cancela cuando quieras · No se requiere tarjeta de crédito para empezar',
  'billing.pricing.perSeat': 'por asiento',
}
