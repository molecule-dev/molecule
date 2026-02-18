import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Greek. */
export const el: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Απαιτείται πάροχος πληρωμών.',
  'user.payment.subscriptionIdRequired': 'Απαιτείται subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Απαιτούνται απόδειξη και planKey.',
  'user.payment.verificationNotConfigured':
    'Η επαλήθευση πληρωμής δεν έχει ρυθμιστεί για {{provider}}.',
  'user.payment.invalidPlan': 'Μη έγκυρο πλάνο.',
  'user.payment.verificationFailed': 'Αποτυχία επαλήθευσης συνδρομής.',
  'user.payment.unknownPlan': 'Άγνωστο πλάνο.',
  'user.payment.invalidWebhookEvent': 'Μη έγκυρο συμβάν webhook.',
}
