import type { BillingTranslations } from './types.js'

/** Billing translations for mk. */
export const mk: Partial<BillingTranslations> = {
  'billing.status.loading': 'Се вчитува…',
  'billing.status.currentPlan': 'Тековен план: {{tierName}}',
  'billing.status.cancelCta': 'Откажи претплата',
  'billing.status.cancelError': 'Не може да се откаже. Обидете се повторно.',
  'billing.pricing.loading': 'Се вчитуваат планови…',
  'billing.pricing.error': 'Не може да се вчитаат цените. Обидете се повторно подоцна.',
  'billing.pricing.checkoutError': 'Не може да се започне со наплата. Обидете се повторно.',
  'billing.pricing.reassurance':
    'Откажи во секое време · Не е потребна кредитна картичка за почеток',
  'billing.pricing.mostPopular': 'Најпопуларни',
  'billing.pricing.tierEyebrow': 'Ниво',
  'billing.pricing.perSeat': 'по седиште',
  'billing.pricing.upgradeCta': 'Надгради на {{tierName}}',
  'billing.pricing.currentCta': 'Тековен план',
  'billing.pricing.period.month': 'месечно',
  'billing.pricing.period.year': 'годишно',
  'billing.pricing.billed.month': 'Наплатува се месечно',
  'billing.pricing.billed.year': 'Наплатува се годишно',
  'billing.pricing.unlimited': 'Неограничено',
  'billing.pricing.limit.maxProjects': 'Максимален број проекти',
  'billing.pricing.limit.canExport': 'Извозот е достапен',
}
