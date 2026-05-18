import type { BillingTranslations } from './types.js'

/** Billing translations for ar. */
export const ar: Partial<BillingTranslations> = {
  'billing.status.loading': 'جارٍ التحميل…',
  'billing.status.cancelCta': 'إلغاء الاشتراك',
  'billing.pricing.loading': 'جارٍ تحميل الخطط…',
  'billing.pricing.error': 'تعذّر تحميل التسعير. حاول لاحقًا.',
  'billing.pricing.checkoutError': 'تعذّر بدء عملية الدفع. حاول مرة أخرى.',
  'billing.pricing.mostPopular': 'الأكثر شيوعًا',
  'billing.pricing.tierEyebrow': 'المستوى',
  'billing.pricing.upgradeCta': 'ترقية إلى {{tierName}}',
  'billing.status.currentPlan': 'الخطة الحالية:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'تعذر الإلغاء. يرجى المحاولة مرة أخرى.',
  'billing.pricing.reassurance': 'يمكنك الإلغاء في أي وقت · لا يلزم وجود بطاقة ائتمان للبدء',
  'billing.pricing.perSeat': 'لكل مقعد',
}
