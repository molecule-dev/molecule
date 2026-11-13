import type { StorageTranslations } from './types.js'

/** Storage translations for Ukrainian. */
export const uk: StorageTranslations = {
  'storage.error.noProvider':
    'Постачальник сховища не налаштований. Спочатку викличте setProvider().',
  'storage.error.quotaExceeded': 'Квоту сховища перевищено при встановленні ключа "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` не встановлено. Встановіть його за допомогою: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Не вдалося встановити значення для ключа " {{key}} " в AsyncStorage',
}
