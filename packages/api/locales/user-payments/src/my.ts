import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Burmese. */
export const my: UserPaymentTranslations = {
  'user.payment.providerRequired': 'ငွေပေးချေမှု ပံ့ပိုးသူ လိုအပ်ပါသည်။',
  'user.payment.subscriptionIdRequired': 'subscriptionId လိုအပ်ပါသည်။',
  'user.payment.receiptAndPlanRequired': 'receipt နှင့် planKey လိုအပ်ပါသည်။',
  'user.payment.verificationNotConfigured':
    '{{provider}} အတွက် ငွေပေးချေမှု အတည်ပြုခြင်း ပြင်ဆင်မထားပါ။',
  'user.payment.invalidPlan': 'Invalid plan for {{provider}}.',
  'user.payment.verificationFailed': 'Payment verification failed for {{provider}}.',
  'user.payment.unknownPlan': 'မသိသော အစီအစဉ်။',
  'user.payment.invalidWebhookEvent': 'Webhook event မမှန်ကန်ပါ။',
}
