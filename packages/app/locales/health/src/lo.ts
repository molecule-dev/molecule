import type { HealthTranslations } from './types.js'

/** Health translations for Lao. */
export const lo: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ຊມ {{minutes}}ນ',
  'health.durationMinutes': '{{minutes}}ນ',
  'health.error.noProvider':
    '`@molecule/app-health`: ບໍ່ມີຜູ້ໃຫ້ບໍລິການດ້ານສຸຂະພາບໃດຖືກຜູກມັດ — ຈັດຕັ້ງປະຕິບັດ `HealthProvider` ໃນ runtime ພື້ນເມືອງຂອງທ່ານ (Apple HealthKit / Android Health Connect / Google Fit) ແລະຜູກມັດມັນກັບ `setProvider()` ໃນເວລາເລີ່ມຕົ້ນ. Molecule ບໍ່ໄດ້ສົ່ງຜູ້ໃຫ້ບໍລິການໃຫ້ມັນ. ກວດສອບຄຸນສົມບັດດ້ວຍ `hasProvider()` ຫຼື `getCapabilities().supported` ກ່ອນທີ່ຈະເອີ້ນ — ການອ່ານຂໍ້ມູນດ້ານສຸຂະພາບບໍ່ມີຄ່າເລີ່ມຕົ້ນທີ່ຊື່ສັດ, ສະນັ້ນສິ່ງນີ້ຈະສົ່ງຄືນຂໍ້ມູນປອມແທນທີ່ຈະສົ່ງຄືນ.',
}
