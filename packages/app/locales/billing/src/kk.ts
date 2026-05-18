import type { BillingTranslations } from './types.js'

/** Billing translations for kk. */
export const kk: Partial<BillingTranslations> = {
  'billing.status.loading': 'Жүктелуде…',
  'billing.status.currentPlan': 'Ағымдағы жоспар:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Жазылымды тоқтату',
  'billing.status.cancelError': 'Бас тарту мүмкін болмады. Қайталап көріңіз.',
  'billing.pricing.loading': 'Жоспарлар жүктелуде…',
  'billing.pricing.error': 'Бағаларды жүктеу мүмкін болмады. Кейінірек қайталап көріңіз.',
  'billing.pricing.checkoutError': 'Төлемді бастау мүмкін болмады. Қайталап көріңіз.',
  'billing.pricing.reassurance':
    'Кез келген уақытта бас тарту · Бастау үшін несие картасы қажет емес',
  'billing.pricing.mostPopular': 'Ең танымал',
  'billing.pricing.tierEyebrow': 'Деңгей',
  'billing.pricing.perSeat': 'орынға',
  'billing.pricing.upgradeCta': 'Жаңарту<x> {{tierName}}</x>',
}
