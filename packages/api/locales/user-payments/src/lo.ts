import type { UserPaymentTranslations } from './types.js'

/** User Payments translations for Lao. */
export const lo: UserPaymentTranslations = {
  'user.payment.providerRequired': 'ຕ້ອງການຜູ້ໃຫ້ບໍລິການຊຳລະເງິນ.',
  'user.payment.subscriptionIdRequired': 'ຕ້ອງການ subscriptionId.',
  'user.payment.receiptAndPlanRequired': 'ຕ້ອງການ receipt ແລະ planKey.',
  'user.payment.verificationNotConfigured':
    'ການຢືນຢັນການຊຳລະເງິນຍັງບໍ່ໄດ້ຕັ້ງຄ່າສຳລັບ {{provider}}.',
  'user.payment.invalidPlan': 'ແຜນບໍ່ຖືກຕ້ອງ.',
  'user.payment.verificationFailed': 'ບໍ່ສາມາດຢືນຢັນການສະໝັກສະມາຊິກໄດ້.',
  'user.payment.unknownPlan': 'ແຜນບໍ່ຮູ້ຈັກ.',
  'user.payment.invalidWebhookEvent': 'ເຫດການ webhook ບໍ່ຖືກຕ້ອງ.',
}
