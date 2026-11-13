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
    '`@molecule/app-battery`: ບໍ່ມີຜູ້ໃຫ້ບໍລິການຖືກຕັ້ງຄ່າໄວ້. ໂທຫາ `setProvider()` ດ້ວຍການຈັດຕັ້ງປະຕິບັດ `BatteryProvider` — ບໍ່ມີຜູ້ໃຫ້ບໍລິການໃດສົ່ງມາພ້ອມກັບກອງອຸປະກອນ; ຈັດຕັ້ງປະຕິບັດອິນເຕີເຟດໃນ runtime ພື້ນເມືອງຂອງທ່ານ ແລະ ເຊື່ອມຕໍ່ມັນ.',
}
