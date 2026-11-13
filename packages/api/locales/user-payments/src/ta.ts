import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Tamil. */
export const ta: UserPaymentTranslations = {
  'user.payment.providerRequired': 'கட்டண வழங்குநர் தேவை.',
  'user.payment.subscriptionIdRequired': 'subscriptionId தேவை.',
  'user.payment.receiptAndPlanRequired': 'receipt மற்றும் planKey தேவை.',
  'user.payment.verificationNotConfigured':
    '{{provider}} க்கான கட்டண சரிபார்ப்பு கட்டமைக்கப்படவில்லை.',
  'user.payment.invalidPlan': '{{provider}} க்கான திட்டம் செல்லாது.',
  'user.payment.verificationFailed': '{{provider}} க்கான கட்டணச் சரிபார்ப்பு தோல்வியடைந்தது.',
  'user.payment.unknownPlan': 'தெரியாத திட்டம்.',
  'user.payment.invalidWebhookEvent': 'தவறான வெப்ஹூக் நிகழ்வு.',
}
