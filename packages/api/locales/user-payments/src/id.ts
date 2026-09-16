import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Indonesian. */
export const id: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Penyedia pembayaran diperlukan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId diperlukan.',
  'user.payment.receiptAndPlanRequired': 'receipt dan planKey diperlukan.',
  'user.payment.verificationNotConfigured':
    'Verifikasi pembayaran belum dikonfigurasi untuk {{provider}}.',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'Paket tidak dikenal.',
  'user.payment.invalidWebhookEvent': 'Event webhook tidak valid.',
}
