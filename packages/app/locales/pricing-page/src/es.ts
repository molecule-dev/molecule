import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for es. */
export const es: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'Cargando planes…',
  'pricingPage.error': 'No se pudieron cargar los precios. Inténtalo más tarde.',
  'pricingPage.checkoutError': 'No se pudo iniciar el pago. Inténtalo de nuevo.',
  'pricingPage.upgradeCta': 'Actualiza a {{tierName}}',
  'pricingPage.currentCta': 'Plan actual',
  'pricingPage.periodToggle.monthly': 'Mensual',
  'pricingPage.periodToggle.yearly': 'Anual',
  'pricingPage.planUpdated.heading': 'Tu plan ha sido actualizado',
  'pricingPage.heading': 'Elige tu plan',
  'pricingPage.perSeat': 'por asiento',
  'pricingPage.periodToggle.label': 'Período de facturación',
  'pricingPage.planUpdated.body':
    'Gracias por actualizar tu plan. Tu nuevo plan está activo de inmediato y te hemos enviado un recibo por correo electrónico.',
  'pricingPage.planUpdated.headingNamed': 'Ahora estás en el<x> {{planName}}</x> plan',
}
