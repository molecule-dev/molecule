import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Hebrew. */
export const he: UserPaymentTranslations = {
  'user.payment.providerRequired': 'נדרש ספק תשלום.',
  'user.payment.subscriptionIdRequired': 'נדרש subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'נדרשים receipt ו-planKey.',
  'user.payment.verificationNotConfigured': 'אימות תשלום לא הוגדר עבור {{provider}}.',
  'user.payment.invalidPlan': 'תוכנית לא חוקית עבור {{provider}}.',
  'user.payment.verificationFailed': 'אימות התשלום עבור {{provider}} נכשל.',
  'user.payment.unknownPlan': 'תוכנית לא ידועה.',
  'user.payment.invalidWebhookEvent': 'אירוע webhook לא תקין.',
}
