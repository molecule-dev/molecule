import type { BillingTranslations } from './types.js'

/** Billing translations for bg. */
export const bg: Partial<BillingTranslations> = {
  'billing.status.loading': 'Зареждане…',
  'billing.status.currentPlan': 'Текущ план: {{tierName}}',
  'billing.status.cancelCta': 'Анулиране на абонамента',
  'billing.status.cancelError': 'Не можа да се отмени. Моля, опитайте отново.',
  'billing.pricing.loading': 'Зареждане на планове…',
  'billing.pricing.error': 'Цените не можаха да се заредят. Опитайте отново по-късно.',
  'billing.pricing.checkoutError': 'Плащането не можа да започне. Моля, опитайте отново.',
  'billing.pricing.reassurance':
    'Анулиране по всяко време · Не е необходима кредитна карта, за да започнете',
  'billing.pricing.mostPopular': 'Най-популярни',
  'billing.pricing.tierEyebrow': 'Ниво',
  'billing.pricing.perSeat': 'на място',
  'billing.pricing.upgradeCta': 'Надстройте до {{tierName}}',
  'billing.pricing.currentCta': 'Текущ план',
  'billing.pricing.period.month': 'месечно',
  'billing.pricing.period.year': 'годишно',
  'billing.pricing.billed.month': 'Месечно таксуване',
  'billing.pricing.billed.year': 'Годишно таксуване',
  'billing.pricing.unlimited': 'Неограничено',
  'billing.pricing.limit.maxProjects': 'Максимален брой проекти',
  'billing.pricing.limit.canExport': 'Експортът е наличен',
}
