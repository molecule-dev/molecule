import type { BillingTranslations } from './types.js'

/** Billing translations for mt. */
export const mt: Partial<BillingTranslations> = {
  'billing.status.loading': 'Qed jitgħabba…',
  'billing.status.currentPlan': 'Pjan attwali:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Ikkanċella l-abbonament',
  'billing.status.cancelError': "Ma stajtx nikkanċella. Jekk jogħġbok erġa' pprova.",
  'billing.pricing.loading': 'Qed jitgħabbew il-pjanijiet…',
  'billing.pricing.error': "Ma setax jitgħabba l-prezzijiet. Erġa' pprova aktar tard.",
  'billing.pricing.checkoutError': "Ma stajtx nibda l-ħlas. Jekk jogħġbok erġa' pprova.",
  'billing.pricing.reassurance':
    "Ikkanċella f'kull ħin · M'hemmx bżonn ta' karta ta' kreditu biex tibda",
  'billing.pricing.mostPopular': 'L-aktar popolari',
  'billing.pricing.tierEyebrow': 'Livell',
  'billing.pricing.perSeat': 'għal kull siġġu',
  'billing.pricing.upgradeCta': 'Aġġorna għal<x> {{tierName}}</x>',
}
