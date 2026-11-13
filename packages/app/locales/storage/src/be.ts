import type { StorageTranslations } from './types.js'

/** Storage translations for Belarusian. */
export const be: StorageTranslations = {
  'storage.error.noProvider': 'Пастаўшчык сховішча не наладжаны. Спачатку выклічце setProvider().',
  'storage.error.quotaExceeded': 'Квота сховішча перавышана пры ўсталяванні ключа "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` не ўсталяваны. Усталюйце яго з дапамогай: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Не атрымалася ўсталяваць значэнне для ключа " {{key}} " у AsyncStorage',
}
