import type { BillingTranslations } from './types.js'

/** Billing translations for uz. */
export const uz: Partial<BillingTranslations> = {
  'billing.status.loading': 'Yuklanmoqda…',
  'billing.status.currentPlan': 'Joriy reja:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Obunani bekor qilish',
  'billing.status.cancelError': "Bekor qilib bo'lmadi. Qaytadan urinib ko'ring.",
  'billing.pricing.loading': 'Rejalar yuklanmoqda…',
  'billing.pricing.error': "Narxlarni yuklab bo'lmadi. Keyinroq qayta urinib ko'ring.",
  'billing.pricing.checkoutError': "To'lovni boshlash imkoni bo'lmadi. Qaytadan urinib ko'ring.",
  'billing.pricing.reassurance':
    'Istalgan vaqtda bekor qiling · Boshlash uchun kredit karta talab qilinmaydi',
  'billing.pricing.mostPopular': 'Eng mashhur',
  'billing.pricing.tierEyebrow': 'Daraja',
  'billing.pricing.perSeat': "har bir o'rindiq uchun",
  'billing.pricing.upgradeCta': 'Yangilash<x> {{tierName}}</x>',
}
