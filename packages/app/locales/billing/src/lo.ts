import type { BillingTranslations } from './types.js'

/** Billing translations for lo. */
export const lo: Partial<BillingTranslations> = {
  'billing.status.loading': 'ກຳລັງໂຫຼດ…',
  'billing.status.currentPlan': 'ແຜນການປະຈຸບັນ:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'ຍົກເລີກການສະໝັກໃຊ້',
  'billing.status.cancelError': 'ບໍ່ສາມາດຍົກເລີກໄດ້. ກະລຸນາລອງໃໝ່ອີກຄັ້ງ.',
  'billing.pricing.loading': 'ກຳລັງໂຫຼດແຜນການ…',
  'billing.pricing.error': 'ບໍ່ສາມາດໂຫຼດລາຄາໄດ້. ລອງໃໝ່ໃນພາຍຫຼັງ.',
  'billing.pricing.checkoutError': 'ບໍ່ສາມາດເລີ່ມການຈ່າຍເງິນໄດ້. ກະລຸນາລອງໃໝ່.',
  'billing.pricing.reassurance': 'ຍົກເລີກໄດ້ທຸກເວລາ · ບໍ່ຈຳເປັນຕ້ອງໃຊ້ບັດເຄຣດິດເພື່ອເລີ່ມຕົ້ນ',
  'billing.pricing.mostPopular': 'ຍອດນິຍົມທີ່ສຸດ',
  'billing.pricing.tierEyebrow': 'ຊັ້ນ',
  'billing.pricing.perSeat': 'ຕໍ່ບ່ອນນັ່ງ',
  'billing.pricing.upgradeCta': 'ອັບເກຣດເປັນ<x> {{tierName}}</x>',
}
