import type { StorageTranslations } from './types.js'

/** Storage translations for Uzbek. */
export const uz: StorageTranslations = {
  'storage.error.noProvider': 'Saqlash provayderi sozlanmagan. Avval setProvider() ni chaqiring.',
  'storage.error.quotaExceeded': '"{{key}}" kalitini o\'rnatishda saqlash kvotasi oshib ketdi',
  'storage.error.asyncStorageUnavailable':
    "`@react-native-async-storage/async-storage` o'rnatilmagan. Uni quyidagi buyruq bilan o'rnating: `npm install @react-native-async-storage/async-storage`",
  'storage.error.setFailed': 'AsyncStorage’da " {{key}} " kaliti uchun qiymat o‘rnatilmadi',
}
