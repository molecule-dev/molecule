import type { BillingTranslations } from './types.js'

/** Billing translations for hy. */
export const hy: Partial<BillingTranslations> = {
  'billing.status.loading': 'Բեռնվում է…',
  'billing.status.currentPlan': 'Ընթացիկ պլանը՝<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Բաժանորդագրության չեղարկում',
  'billing.status.cancelError': 'Չհաջողվեց չեղարկել։ Խնդրում ենք կրկին փորձել։',
  'billing.pricing.loading': 'Բեռնվում են պլանները…',
  'billing.pricing.error': 'Չհաջողվեց բեռնել գնագոյացումը։ Փորձեք կրկին ավելի ուշ։',
  'billing.pricing.checkoutError': 'Հնարավոր չէ սկսել վճարումը։ Խնդրում ենք կրկին փորձել։',
  'billing.pricing.reassurance':
    'Չեղարկել ցանկացած ժամանակ · Սկսելու համար վարկային քարտ անհրաժեշտ չէ',
  'billing.pricing.mostPopular': 'Ամենատարածվածը',
  'billing.pricing.tierEyebrow': 'Շերտ',
  'billing.pricing.perSeat': 'մեկ տեղի համար',
  'billing.pricing.upgradeCta': 'Թարմացնել մինչև<x> {{tierName}}</x>',
}
