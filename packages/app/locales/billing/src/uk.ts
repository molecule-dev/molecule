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
  'billing.status.currentPlan': 'Поточний план: {{tierName}}',
  'billing.status.cancelError': 'Не вдалося скасувати. Спробуйте ще раз.',
  'billing.pricing.reassurance': 'Скасувати будь-коли · Для початку не потрібна кредитна картка',
  'billing.pricing.tierEyebrow': 'Рівень',
  'billing.pricing.perSeat': 'за місце',
  'billing.pricing.currentCta': 'Поточний план',
  'billing.pricing.period.month': 'на місяць',
  'billing.pricing.period.year': 'на рік',
  'billing.pricing.billed.month': 'Щомісячна оплата',
  'billing.pricing.billed.year': 'Щорічна оплата',
  'billing.pricing.unlimited': 'Без обмежень',
  'billing.pricing.limit.maxProjects': 'Максимум проєктів',
  'billing.pricing.limit.canExport': 'Експорт доступний',
}
