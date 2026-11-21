import type { BillingTranslations } from './types.js'

/** Billing translations for hu. */
export const hu: Partial<BillingTranslations> = {
  'billing.status.loading': 'Betöltés…',
  'billing.status.cancelCta': 'Előfizetés lemondása',
  'billing.pricing.loading': 'Csomagok betöltése…',
  'billing.pricing.error': 'Az árak betöltése nem sikerült. Próbálja újra később.',
  'billing.pricing.checkoutError': 'Nem sikerült elindítani a pénztárat. Kérjük, próbálja újra.',
  'billing.pricing.mostPopular': 'Legnépszerűbb',
  'billing.pricing.upgradeCta': 'Váltás: {{tierName}}',
  'billing.status.currentPlan': 'Jelenlegi terv: {{tierName}}',
  'billing.status.cancelError': 'Nem sikerült megszakítani. Próbáld újra.',
  'billing.pricing.reassurance': 'Bármikor lemondható · Nem szükséges hitelkártya a kezdéshez',
  'billing.pricing.tierEyebrow': 'Szint',
  'billing.pricing.perSeat': 'ülésenként',
  'billing.pricing.currentCta': 'Jelenlegi terv',
  'billing.pricing.period.month': 'havonta',
  'billing.pricing.period.year': 'évente',
  'billing.pricing.billed.month': 'Havonta számlázva',
  'billing.pricing.billed.year': 'Évente számlázva',
  'billing.pricing.unlimited': 'Korlátlan',
  'billing.pricing.limit.maxProjects': 'Maximális projektszám',
  'billing.pricing.limit.canExport': 'Exportálás elérhető',
}
