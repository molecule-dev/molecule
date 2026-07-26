import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Vietnamese. */
export const vi: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Yêu cầu nhà cung cấp thanh toán.',
  'user.payment.subscriptionIdRequired': 'Yêu cầu subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Yêu cầu receipt và planKey.',
  'user.payment.verificationNotConfigured':
    'Xác minh thanh toán chưa được cấu hình cho {{provider}}.',
  'user.payment.invalidPlan': 'Gói không hợp lệ.',
  'user.payment.verificationFailed': 'Xác minh đăng ký thất bại.',
  'user.payment.unknownPlan': 'Gói không xác định.',
  'user.payment.invalidWebhookEvent': 'Sự kiện webhook không hợp lệ.',
}
