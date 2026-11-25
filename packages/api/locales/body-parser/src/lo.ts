import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Lao. */
export const lo: BodyParserTranslations = {
  'middleware.error.badRequest': 'ຄຳຂໍບໍ່ຖືກຕ້ອງ.',
  'middleware.error.fileTooLarge': 'ໄຟລ໌ໃຫຍ່ກວ່າ {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'ບໍ່ອະນຸຍາດໄຟລ໌ປະເພດນີ້. ປະເພດທີ່ອະນຸຍາດ: {{types}}.',
  'middleware.error.fileMissing': 'ສົ່ງໄຟລ໌ໃນຊ່ອງ "{{field}}".',
  'middleware.error.tooManyFiles': 'ໄຟລ໌ຫຼາຍເກີນໄປ. ຂີດຈຳກັດແມ່ນ {{max}}.',
  'middleware.error.unexpectedFile': 'ສົ່ງໄຟລ໌ໃນຊ່ອງ "{{expected}}", ບໍ່ແມ່ນ "{{field}}".',
  'middleware.error.notMultipart': 'ສົ່ງໄຟລ໌ເປັນ multipart/form-data ໃນຊ່ອງ "{{field}}".',
  'middleware.error.payloadTooLarge': 'ຄຳຮ້ອງຂໍໃຫຍ່ເກີນໄປ.',
}
