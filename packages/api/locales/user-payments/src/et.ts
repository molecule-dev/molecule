import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Estonian. */
export const et: UserPaymentTranslations = {
  'user.payment.providerRequired': 'Makseteenuse pakkuja on nõutav.',
  'user.payment.subscriptionIdRequired': 'subscriptionId on nõutav.',
  'user.payment.receiptAndPlanRequired': 'Kviitung ja planKey on nõutavad.',
  'user.payment.verificationNotConfigured':
    'Makse kinnitamine pole seadistatud teenusele {{provider}}.',
  'user.payment.invalidPlan': 'Kehtetu pakett teenusepakkuja {{provider}} jaoks.',
  'user.payment.verificationFailed': 'Makse kinnitamine teenusepakkujale {{provider}} ebaõnnestus.',
  'user.payment.unknownPlan': 'Tundmatu plaan.',
  'user.payment.invalidWebhookEvent': 'Vigane webhooki sündmus.',
}
