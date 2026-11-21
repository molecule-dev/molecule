import type { BillingTranslations } from './types.js'

/** Billing translations for et. */
export const et: Partial<BillingTranslations> = {
  'billing.status.loading': 'Laadimine…',
  'billing.status.currentPlan': 'Praegune plaan: {{tierName}}',
  'billing.status.cancelCta': 'Tühista tellimus',
  'billing.status.cancelError': 'Tühistamine ebaõnnestus. Palun proovige uuesti.',
  'billing.pricing.loading': 'Plaanide laadimine…',
  'billing.pricing.error': 'Hinnakujundust ei õnnestunud laadida. Proovige hiljem uuesti.',
  'billing.pricing.checkoutError': 'Makseprotsessi ei õnnestunud alustada. Palun proovige uuesti.',
  'billing.pricing.reassurance': 'Tühistada saab igal ajal · Alustamiseks pole krediitkaarti vaja',
  'billing.pricing.mostPopular': 'Kõige populaarsem',
  'billing.pricing.tierEyebrow': 'Tasand',
  'billing.pricing.perSeat': 'istekoha kohta',
  'billing.pricing.upgradeCta': 'Uuenda versioonile {{tierName}}',
  'billing.pricing.currentCta': 'Praegune plaan',
  'billing.pricing.period.month': 'kuus',
  'billing.pricing.period.year': 'aastas',
  'billing.pricing.billed.month': 'Arve esitatakse igakuiselt',
  'billing.pricing.billed.year': 'Arve esitatakse kord aastas',
  'billing.pricing.unlimited': 'Piiramatu',
  'billing.pricing.limit.maxProjects': 'Maksimaalne projektide arv',
  'billing.pricing.limit.canExport': 'Eksport on saadaval',
}
