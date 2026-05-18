import type { BillingTranslations } from './types.js'

/** Billing translations for it. */
export const it: Partial<BillingTranslations> = {
  'billing.status.loading': 'Caricamento…',
  'billing.status.cancelCta': 'Annulla abbonamento',
  'billing.pricing.loading': 'Caricamento piani…',
  'billing.pricing.error': 'Impossibile caricare i prezzi. Riprovi più tardi.',
  'billing.pricing.checkoutError': 'Impossibile avviare il checkout. Riprovi.',
  'billing.pricing.mostPopular': 'Più popolare',
  'billing.pricing.tierEyebrow': 'Livello',
  'billing.pricing.upgradeCta': 'Aggiorna a {{tierName}}',
  'billing.status.currentPlan': 'Piano attuale:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'Impossibile annullare. Riprova.',
  'billing.pricing.reassurance':
    'Annulla in qualsiasi momento · Non è richiesta alcuna carta di credito per iniziare',
  'billing.pricing.perSeat': 'per posto a sedere',
}
