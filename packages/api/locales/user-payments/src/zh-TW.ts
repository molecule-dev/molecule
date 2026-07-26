import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Chinese (Traditional). */
export const zhTW: UserPaymentTranslations = {
  'user.payment.providerRequired': '需要付款提供商。',
  'user.payment.subscriptionIdRequired': '需要 subscriptionId。',
  'user.payment.receiptAndPlanRequired': '需要 receipt 和 planKey。',
  'user.payment.verificationNotConfigured': '{{provider}} 的付款驗證未設定。',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': '未知的方案。',
  'user.payment.invalidWebhookEvent': '無效的 Webhook 事件。',
}
