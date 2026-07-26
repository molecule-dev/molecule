import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Chinese. */
export const zh: UserPaymentTranslations = {
  'user.payment.providerRequired': '需要支付提供商。',
  'user.payment.subscriptionIdRequired': '需要 subscriptionId。',
  'user.payment.receiptAndPlanRequired': '需要 receipt 和 planKey。',
  'user.payment.verificationNotConfigured': '{{provider}} 的支付验证未配置。',
  'user.payment.invalidPlan': '无效的方案。',
  'user.payment.verificationFailed': '订阅验证失败。',
  'user.payment.unknownPlan': '未知的方案。',
  'user.payment.invalidWebhookEvent': '无效的 Webhook 事件。',
}
