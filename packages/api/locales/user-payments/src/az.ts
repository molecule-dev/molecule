import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Azerbaijani. */
export const az: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Ödəniş provayderi tələb olunur.',
  'user.payment.subscriptionIdRequired': 'subscriptionId tələb olunur.',
  'user.payment.receiptAndPlanRequired': 'receipt və planKey tələb olunur.',
  'user.payment.verificationNotConfigured':
    '{{provider}} üçün ödəniş doğrulaması konfiqurasiya edilməyib.',
  'user.payment.invalidPlan': 'Yanlış plan.',
  'user.payment.verificationFailed': 'Abunəlik doğrulanması uğursuz oldu.',
  'user.payment.unknownPlan': 'Naməlum plan.',
  'user.payment.invalidWebhookEvent': 'Yanlış webhook hadisəsi.',
}
