import type { BillingTranslations } from './types.js'

/** Billing translations for et. */
export const et: Partial<BillingTranslations> = {
  'billing.status.loading': 'Laadimine…',
  'billing.status.currentPlan': 'Praegune plaan:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Tühista tellimus',
  'billing.status.cancelError': 'Tühistamine ebaõnnestus. Palun proovige uuesti.',
  'billing.pricing.loading': 'Plaanide laadimine…',
  'billing.pricing.error': 'Hinnakujundust ei õnnestunud laadida. Proovige hiljem uuesti.',
  'billing.pricing.checkoutError': 'Makseprotsessi ei õnnestunud alustada. Palun proovige uuesti.',
  'billing.pricing.reassurance': 'Tühistada saab igal ajal · Alustamiseks pole krediitkaarti vaja',
  'billing.pricing.mostPopular': 'Kõige populaarsem',
  'billing.pricing.tierEyebrow': 'Tasand',
  'billing.pricing.perSeat': 'istekoha kohta',
  'billing.pricing.upgradeCta': 'Uuenda versioonile<x> {{tierName}}</x>',
}
