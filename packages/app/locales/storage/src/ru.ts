import type { StorageTranslations } from './types.js'

/** Storage translations for Russian. */
export const ru: StorageTranslations = {
  'storage.error.noProvider': 'Провайдер хранилища не настроен. Сначала вызовите setProvider().',
  'storage.error.quotaExceeded': 'Квота хранилища превышена при установке ключа "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` не установлен. Установите его с помощью команды: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Не удалось установить значение для ключа " {{key}} " в AsyncStorage.',
}
