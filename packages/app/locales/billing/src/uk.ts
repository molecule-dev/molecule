import type { BillingTranslations } from './types.js'

/** Billing translations for uk. */
export const uk: Partial<BillingTranslations> = {
  'billing.status.loading': 'Завантаження…',
  'billing.status.cancelCta': 'Скасувати підписку',
  'billing.pricing.loading': 'Завантаження планів…',
  'billing.pricing.error': 'Не вдалося завантажити ціни. Спробуйте пізніше.',
  'billing.pricing.checkoutError': 'Не вдалося розпочати оформлення. Будь ласка, спробуйте ще раз.',
  'billing.pricing.mostPopular': 'Найпопулярніший',
  'billing.pricing.upgradeCta': 'Перейти на {{tierName}}',
  'billing.status.currentPlan': 'Поточний план:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'Не вдалося скасувати. Спробуйте ще раз.',
  'billing.pricing.reassurance': 'Скасувати будь-коли · Для початку не потрібна кредитна картка',
  'billing.pricing.tierEyebrow': 'Рівень',
  'billing.pricing.perSeat': 'за місце',
}
