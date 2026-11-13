import type { StorageTranslations } from './types.js'

/** Storage translations for Macedonian. */
export const mk: StorageTranslations = {
  'storage.error.noProvider':
    'Давателот на складирање не е конфигуриран. Повикајте setProvider() прво.',
  'storage.error.quotaExceeded': 'Квотата за складирање е надмината при поставување клуч "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` не е инсталиран. Инсталирајте го со: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Не успеа да се постави вредност за клучот „ {{key}} “ во AsyncStorage',
}
