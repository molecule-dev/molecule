import type { BillingTranslations } from './types.js'

/** Billing translations for uz. */
export const uz: Partial<BillingTranslations> = {
  'billing.status.loading': 'Yuklanmoqda…',
  'billing.status.currentPlan': 'Joriy reja:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Obunani bekor qilish',
  'billing.status.cancelError': 'Bekor qilib bo&#39;lmadi. Qaytadan urinib ko&#39;ring.',
  'billing.pricing.loading': 'Rejalar yuklanmoqda…',
  'billing.pricing.error': 'Narxlarni yuklab bo&#39;lmadi. Keyinroq qayta urinib ko&#39;ring.',
  'billing.pricing.checkoutError':
    'To&#39;lovni boshlash imkoni bo&#39;lmadi. Qaytadan urinib ko&#39;ring.',
  'billing.pricing.reassurance':
    'Istalgan vaqtda bekor qiling · Boshlash uchun kredit karta talab qilinmaydi',
  'billing.pricing.mostPopular': 'Eng mashhur',
  'billing.pricing.tierEyebrow': 'Daraja',
  'billing.pricing.perSeat': 'har bir o&#39;rindiq uchun',
  'billing.pricing.upgradeCta': 'Yangilash<x> {{tierName}}</x>',
}
