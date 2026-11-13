import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Finnish. */
export const fi: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Maksupalveluntarjoaja vaaditaan.',
  'user.payment.subscriptionIdRequired': 'subscriptionId vaaditaan.',
  'user.payment.receiptAndPlanRequired': 'Kuitti ja planKey vaaditaan.',
  'user.payment.verificationNotConfigured':
    'Maksuvahvistusta ei ole määritetty palvelulle {{provider}}.',
  'user.payment.invalidPlan': 'Virheellinen liittymä palveluntarjoajalle {{provider}}.',
  'user.payment.verificationFailed':
    'Maksun vahvistus epäonnistui palveluntarjoajalle {{provider}}.',
  'user.payment.unknownPlan': 'Tuntematon paketti.',
  'user.payment.invalidWebhookEvent': 'Virheellinen webhook-tapahtuma.',
}
