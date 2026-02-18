import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Japanese. */
export const ja: UserPaymentTranslations = {
  'user.payment.providerRequired': '決済プロバイダーは必須です。',
  'user.payment.subscriptionIdRequired': 'subscriptionIdは必須です。',
  'user.payment.receiptAndPlanRequired': 'receiptとplanKeyは必須です。',
  'user.payment.verificationNotConfigured': '{{provider}}の決済認証が設定されていません。',
  'user.payment.invalidPlan': '無効なプランです。',
  'user.payment.verificationFailed': 'サブスクリプションの確認に失敗しました。',
  'user.payment.unknownPlan': '不明なプランです。',
  'user.payment.invalidWebhookEvent': '無効なWebhookイベントです。',
}
