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
}
