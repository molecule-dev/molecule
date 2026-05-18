import type { BillingTranslations } from './types.js'

/** Billing translations for pt. */
export const pt: Partial<BillingTranslations> = {
  'billing.status.loading': 'Carregando…',
  'billing.status.cancelCta': 'Cancelar assinatura',
  'billing.pricing.loading': 'Carregando planos…',
  'billing.pricing.error': 'Não foi possível carregar os preços. Tente novamente mais tarde.',
  'billing.pricing.checkoutError': 'Não foi possível iniciar o checkout. Tente novamente.',
  'billing.pricing.mostPopular': 'Mais popular',
  'billing.pricing.tierEyebrow': 'Nível',
  'billing.pricing.upgradeCta': 'Atualizar para {{tierName}}',
}
