import type { UploadsTranslations } from './types.js'

/** Uploads translations for Lao. */
export const lo: UploadsTranslations = {
  'uploads.error.noProvider': 'ຜູ້ໃຫ້ບໍລິການອັບໂຫລດບໍ່ໄດ້ຕັ້ງຄ່າ. ເອີ້ນ setProvider() ກ່ອນ.',
  'uploads.error.streamLimitReached': 'ຮອດຂີດຈຳກັດຂອງສະຕຣີມແລ້ວ.',
  'uploads.error.aborted': 'ການອັບໂຫລດຖືກຍົກເລີກ.',
  'uploads.error.fileTypeBlocked': 'ບໍ່ສາມາດອັບໂຫລດໄຟລ໌ປະເພດ {{type}} ໄດ້.',
  'uploads.error.activeTypeListed':
    'receiveUploads() ລະບຸ {{type}} ເຊິ່ງເປັນປະເພດທີ່ບຣາວເຊີແລ່ນ. ສົ່ງ allowActiveTypes: true ເພື່ອເກັບມັນ ແລະ ໃຫ້ບໍລິການໄຟລ໌ເຫຼົ່ານັ້ນດ້ວຍ sendUpload().',
}
