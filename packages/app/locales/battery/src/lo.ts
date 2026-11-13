import type { BatteryTranslations } from './types.js'

/** Battery translations for Lao. */
export const lo: BatteryTranslations = {
  'battery.charging': 'ກຳລັງສາກ',
  'battery.discharging': 'ໃຊ້ແບັດເຕີຣີ',
  'battery.full': 'ສາກເຕັມແລ້ວ',
  'battery.not-charging': 'ບໍ່ໄດ້ສາກ',
  'battery.unknown': 'ບໍ່ຮູ້',
  'battery.remainingUnknown': 'ບໍ່ຮູ້',
  'battery.remainingTime': '{{hours}}ຊມ {{minutes}}ນ',
  'battery.remainingMinutes': '{{minutes}}ນ',
  'battery.error.noProvider':
    '`@molecule/app-battery`: ບໍ່ໄດ້ຕັ້ງຜູ້ໃຫ້ບໍລິການ. ເອີ້ນ `setProvider()` ດ້ວຍການຈັດຕັ້ງປະຕິບັດ `BatteryProvider` — Molecule ບໍ່ໄດ້ສົ່ງຜູ້ໃຫ້ບໍລິການໃດໆໃຫ້ມັນ; ຈັດຕັ້ງປະຕິບັດອິນເຕີເຟດໃນ runtime ພື້ນເມືອງຂອງທ່ານ ແລະ ເຊື່ອມຕໍ່ມັນ.',
}
