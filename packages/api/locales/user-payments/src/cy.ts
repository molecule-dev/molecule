import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Welsh. */
export const cy: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Mae angen darparwr taliad.',
  'user.payment.subscriptionIdRequired': 'Mae angen subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'Mae angen derbynneb a planKey.',
  'user.payment.verificationNotConfigured':
    "Nid yw dilysu taliad wedi'i ffurfweddu ar gyfer {{provider}}.",
  'user.payment.invalidPlan': 'Cynllun annilys.',
  'user.payment.verificationFailed': 'Methwyd dilysu tanysgrifiad.',
  'user.payment.unknownPlan': 'Cynllun anhysbys.',
  'user.payment.invalidWebhookEvent': 'Digwyddiad bachyn gwe annilys.',
}
