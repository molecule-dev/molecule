import type { StorageTranslations } from './types.js'

/** Storage translations for Mongolian. */
export const mn: StorageTranslations = {
  'storage.error.noProvider':
    'Хадгалалтын үйлчилгээ тохируулагдаагүй. Эхлээд setProvider() дуудна уу.',
  'storage.error.quotaExceeded': '"{{key}}" түлхүүрийг тохируулахад хадгалалтын квот хэтэрсэн',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` суулгаагүй байна. Үүнийг дараах тушаалаар суулгана уу: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage дахь " {{key}} " түлхүүрийн утгыг тохируулж чадсангүй',
}
