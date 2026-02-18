import type { ConfigTranslations } from './types.js'

/** Config translations for Lao. */
export const lo: ConfigTranslations = {
  'config.error.required': "ການຕັ້ງຄ່າທີ່ຕ້ອງການ '{{key}}' ບໍ່ໄດ້ຖືກຕັ້ງໄວ້.",
  'config.error.mustBeNumber': "ການຕັ້ງຄ່າ '{{key}}' ຕ້ອງເປັນຕົວເລກ.",
  'config.error.minValue': "ການຕັ້ງຄ່າ '{{key}}' ຕ້ອງມີຢ່າງໜ້ອຍ {{min}}.",
  'config.error.maxValue': "ການຕັ້ງຄ່າ '{{key}}' ຕ້ອງມີຫຼາຍສຸດ {{max}}.",
  'config.error.mustBeBoolean': "ການຕັ້ງຄ່າ '{{key}}' ຕ້ອງເປັນບູລີນ (true/false/1/0).",
  'config.error.mustBeJson': "ການຕັ້ງຄ່າ '{{key}}' ຕ້ອງເປັນ JSON ທີ່ຖືກຕ້ອງ.",
  'config.error.patternMismatch': "ການຕັ້ງຄ່າ '{{key}}' ບໍ່ກົງກັບຮູບແບບ '{{pattern}}'.",
  'config.error.invalidEnum': "ການຕັ້ງຄ່າ '{{key}}' ຕ້ອງເປັນໜຶ່ງໃນ: {{values}}.",
  'config.error.validationNotSupported':
    'ຜູ້ໃຫ້ບໍລິການການຕັ້ງຄ່າປະຈຸບັນບໍ່ຮອງຮັບການກວດສອບຄວາມຖືກຕ້ອງ.',
}
