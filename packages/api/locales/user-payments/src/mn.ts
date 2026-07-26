import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Mongolian. */
export const mn: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Төлбөрийн нийлүүлэгч шаардлагатай.',
  'user.payment.subscriptionIdRequired': 'subscriptionId шаардлагатай.',
  'user.payment.receiptAndPlanRequired': 'receipt болон planKey шаардлагатай.',
  'user.payment.verificationNotConfigured':
    '{{provider}}-д төлбөрийн баталгаажуулалт тохируулагдаагүй байна.',
  'user.payment.invalidPlan': 'Буруу төлөвлөгөө.',
  'user.payment.verificationFailed': 'Захиалга баталгаажуулахад алдаа гарлаа.',
  'user.payment.unknownPlan': 'Тодорхойгүй төлөвлөгөө.',
  'user.payment.invalidWebhookEvent': 'Буруу вебхүк үйл явдал.',
}
