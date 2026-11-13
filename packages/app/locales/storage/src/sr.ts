import type { StorageTranslations } from './types.js'

/** Storage translations for Serbian. */
export const sr: StorageTranslations = {
  'storage.error.noProvider':
    'Провајдер складиштења није конфигурисан. Прво позовите setProvider().',
  'storage.error.quotaExceeded': 'Квота складиштења премашена при постављању кључа "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` није инсталиран. Инсталирајте га са: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Није успело подешавање вредности за кључ „ {{key}} “ у AsyncStorage-у',
}
