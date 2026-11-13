import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Mongolian. */
export const mn: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Төлбөрийн нийлүүлэгч шаардлагатай.',
  'user.payment.subscriptionIdRequired': 'subscriptionId шаардлагатай.',
  'user.payment.receiptAndPlanRequired': 'receipt болон planKey шаардлагатай.',
  'user.payment.verificationNotConfigured':
    '{{provider}}-д төлбөрийн баталгаажуулалт тохируулагдаагүй байна.',
  'user.payment.invalidPlan': '{{provider}}-н төлөвлөгөө буруу байна.',
  'user.payment.verificationFailed': '{{provider}} н төлбөрийн баталгаажуулалт амжилтгүй боллоо.',
  'user.payment.unknownPlan': 'Тодорхойгүй төлөвлөгөө.',
  'user.payment.invalidWebhookEvent': 'Буруу вебхүк үйл явдал.',
}
