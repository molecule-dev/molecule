import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Malay. */
export const ms: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Penyedia pembayaran diperlukan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId diperlukan.',
  'user.payment.receiptAndPlanRequired': 'receipt dan planKey diperlukan.',
  'user.payment.verificationNotConfigured':
    'Pengesahan pembayaran tidak dikonfigurasi untuk {{provider}}.',
  'user.payment.invalidPlan': 'Pelan tidak sah.',
  'user.payment.verificationFailed': 'Gagal mengesahkan langganan.',
  'user.payment.unknownPlan': 'Pelan tidak dikenali.',
  'user.payment.invalidWebhookEvent': 'Acara webhook tidak sah.',
}
