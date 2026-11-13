import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Georgian. */
export const ka: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Gadakhdis provaideri sachiroa.',
  'user.payment.subscriptionIdRequired': 'subscriptionId sachiron.',
  'user.payment.receiptAndPlanRequired': 'qvitari da planKey sachiroa.',
  'user.payment.verificationNotConfigured':
    'Gadakhdis veripikacia ar aris konphiguratsirebulia {{provider}}-istvis.',
  'user.payment.invalidPlan': '{{provider}}-ის არასწორი გეგმა.',
  'user.payment.verificationFailed': 'გადახდის დადასტურება {{provider}} ისთვის ვერ მოხერხდა.',
  'user.payment.unknownPlan': 'Uchnobi gegma.',
  'user.payment.invalidWebhookEvent': 'Aratsvalidi webhook movlena.',
}
