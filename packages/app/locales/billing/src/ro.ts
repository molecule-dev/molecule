import type { BillingTranslations } from './types.js'

/** Billing translations for ro. */
export const ro: Partial<BillingTranslations> = {
  'billing.status.loading': 'Se încarcă…',
  'billing.status.cancelCta': 'Anulați abonamentul',
  'billing.pricing.loading': 'Se încarcă planurile…',
  'billing.pricing.error': 'Nu s-au putut încărca prețurile. Încercați mai târziu.',
  'billing.pricing.checkoutError':
    'Nu s-a putut iniția casa de plată. Vă rugăm să încercați din nou.',
  'billing.pricing.mostPopular': 'Cel mai popular',
  'billing.pricing.upgradeCta': 'Treceți la {{tierName}}',
  'billing.status.currentPlan': 'Planul actual:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'Nu s-a putut anula. Vă rugăm să încercați din nou.',
  'billing.pricing.reassurance': 'Anulați oricând · Nu este necesar card de credit pentru a începe',
  'billing.pricing.tierEyebrow': 'Nivel',
  'billing.pricing.perSeat': 'per loc',
}
