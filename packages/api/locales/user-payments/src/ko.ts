import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Korean. */
export const ko: UserPaymentTranslations = {
  'user.payment.providerRequired': '결제 제공자가 필요합니다.',
  'user.payment.subscriptionIdRequired': 'subscriptionId가 필요합니다.',
  'user.payment.receiptAndPlanRequired': 'receipt와 planKey가 필요합니다.',
  'user.payment.verificationNotConfigured': '{{provider}}에 대한 결제 인증이 구성되지 않았습니다.',
  'user.payment.invalidPlan': '유효하지 않은 요금제입니다.',
  'user.payment.verificationFailed': '구독 확인에 실패했습니다.',
  'user.payment.unknownPlan': '알 수 없는 요금제입니다.',
  'user.payment.invalidWebhookEvent': '유효하지 않은 웹훅 이벤트입니다.',
}
