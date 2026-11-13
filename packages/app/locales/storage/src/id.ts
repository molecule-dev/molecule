import type { StorageTranslations } from './types.js'

/** Storage translations for Indonesian. */
export const id: StorageTranslations = {
  'storage.error.noProvider':
    'Penyedia penyimpanan belum dikonfigurasi. Panggil setProvider() terlebih dahulu.',
  'storage.error.quotaExceeded': 'Kuota penyimpanan terlampaui saat mengatur kunci "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` belum terpasang. Pasang dengan: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Gagal mengatur nilai untuk kunci " {{key}} " di AsyncStorage',
}
