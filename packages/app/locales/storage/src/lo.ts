import type { StorageTranslations } from './types.js'

/** Storage translations for Lao. */
export const lo: StorageTranslations = {
  'storage.error.noProvider': 'ບໍ່ໄດ້ກຳນົດຄ່າຜູ້ໃຫ້ບໍລິການເກັບຮັກສາ. ໂທ setProvider() ກ່ອນ.',
  'storage.error.quotaExceeded': 'ໂຄຕ້າການເກັບຮັກສາເກີນຕົວໃນເວລາຕັ້ງກະແຈ "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    'ຍັງບໍ່ໄດ້ຕິດຕັ້ງ `@react-native-async-storage/async-storage` . ຕິດຕັ້ງມັນດ້ວຍ: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'ລົ້ມເຫຼວໃນການກຳນົດຄ່າສຳລັບລະຫັດ " {{key}} " ໃນ AsyncStorage',
}
