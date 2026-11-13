import type { AiTranslations } from './types.js'

/** Ai translations for Lao. */
export const lo: AiTranslations = {
  'ai.error.noProvider': 'ຜູ້ໃຫ້ບໍລິການ AI ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ. ເຊື່ອມຕໍ່ຜູ້ໃຫ້ບໍລິການ AI ກ່ອນ.',
  'ai.error.ambiguousProvider':
    'ຜູ້ໃຫ້ບໍລິການ AI ທີ່ມີຊື່ຫຼາຍລາຍໄດ້ຖືກເຊື່ອມຕໍ່ ແລະ ບໍ່ໄດ້ຕັ້ງຄ່າເລີ່ມຕົ້ນ. ໃຊ້ getProviderByName(name) ເພື່ອເລືອກໜຶ່ງ.',
  'ai.error.responseIncomplete':
    'ການຕອບສະໜອງຂອງ AI ສິ້ນສຸດລົງກ່ອນທີ່ຈະສຳເລັດ. ກະລຸນາລອງໃໝ່ອີກຄັ້ງ.',
  'ai.error.responseTokenLimit':
    'ການຕອບສະໜອງຂອງ AI ໄດ້ຮອດຂີດຈຳກັດຂອງໂທເຄັນຜົນຜະລິດກ່ອນທີ່ຈະສຳເລັດ.',
  'ai.error.apiError': 'ການບໍລິການ AI ຜິດພາດ. ກະລຸນາລອງໃໝ່ອີກຄັ້ງ.',
  'ai.error.noResponseBody': 'ບໍ່ມີການຕອບສະໜອງຈາກບໍລິການ AI.',
}
