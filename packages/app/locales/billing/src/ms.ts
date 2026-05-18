import type { BillingTranslations } from './types.js'

/** Billing translations for ms. */
export const ms: Partial<BillingTranslations> = {
  'billing.status.loading': 'Memuatkan…',
  'billing.status.cancelCta': 'Batalkan langganan',
  'billing.pricing.loading': 'Memuatkan pelan…',
  'billing.pricing.error': 'Tidak dapat memuatkan harga. Cuba lagi nanti.',
  'billing.pricing.checkoutError': 'Tidak dapat memulakan daftar keluar. Sila cuba lagi.',
  'billing.pricing.mostPopular': 'Paling popular',
  'billing.pricing.upgradeCta': 'Naik taraf ke {{tierName}}',
  'billing.status.currentPlan': 'Pelan semasa:<x> {{TierName}}</x>',
  'billing.status.cancelError': 'Tidak dapat membatalkan. Sila cuba lagi.',
  'billing.pricing.reassurance':
    'Batal pada bila-bila masa · Kad kredit tidak diperlukan untuk bermula',
  'billing.pricing.tierEyebrow': 'Peringkat',
  'billing.pricing.perSeat': 'setiap tempat duduk',
}
