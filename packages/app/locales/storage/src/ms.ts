import type { StorageTranslations } from './types.js'

/** Storage translations for Malay. */
export const ms: StorageTranslations = {
  'storage.error.noProvider':
    'Pembekal storan tidak dikonfigurasikan. Panggil setProvider() dahulu.',
  'storage.error.quotaExceeded': 'Kuota storan melebihi semasa menetapkan kunci "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` tidak dipasang. Pasangkannya dengan: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Gagal menetapkan nilai untuk kekunci " {{key}} " dalam AsyncStorage',
}
