import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Persian. */
export const fa: UserPaymentTranslations = {
  'user.payment.providerRequired': 'ارائه‌دهنده پرداخت الزامی است.',
  'user.payment.subscriptionIdRequired': 'subscriptionId الزامی است.',
  'user.payment.receiptAndPlanRequired': 'receipt و planKey الزامی هستند.',
  'user.payment.verificationNotConfigured': 'تأیید پرداخت برای {{provider}} پیکربندی نشده است.',
  'user.payment.invalidPlan': 'طرح نامعتبر.',
  'user.payment.verificationFailed': 'تأیید اشتراک ناموفق بود.',
  'user.payment.unknownPlan': 'طرح نامشخص.',
  'user.payment.invalidWebhookEvent': 'رویداد وب‌هوک نامعتبر.',
}
