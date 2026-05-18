import type { BillingTranslations } from './types.js'

/** Billing translations for ha. */
export const ha: Partial<BillingTranslations> = {
  'billing.status.loading': 'Ana lodawa…',
  'billing.status.currentPlan': 'Tsarin yanzu:<x> {{sunan tier}}</x>',
  'billing.status.cancelCta': 'Soke biyan kuɗi',
  'billing.status.cancelError': 'Ba zan iya sokewa ba. Da fatan za a sake gwadawa.',
  'billing.pricing.loading': 'Ana loda tsare-tsare…',
  'billing.pricing.error': 'Ba za a iya loda farashi ba. Gwada kuma daga baya.',
  'billing.pricing.checkoutError': 'Ban iya fara biyan kuɗi ba. Da fatan za a sake gwadawa.',
  'billing.pricing.reassurance': 'Soke kowane lokaci · Ba a buƙatar katin kiredit don farawa',
  'billing.pricing.mostPopular': 'Mafi shahara',
  'billing.pricing.tierEyebrow': 'Matsayi',
  'billing.pricing.perSeat': 'a kowace kujera',
  'billing.pricing.upgradeCta': 'Haɓakawa zuwa<x> {{sunan tier}}</x>',
}
