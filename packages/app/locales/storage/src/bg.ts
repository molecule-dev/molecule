import type { StorageTranslations } from './types.js'

/** Storage translations for Bulgarian. */
export const bg: StorageTranslations = {
  'storage.error.noProvider':
    'Доставчикът на хранилище не е конфигуриран. Извикайте setProvider() първо.',
  'storage.error.quotaExceeded': 'Квотата за съхранение е надвишена при задаване на ключ "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` не е инсталиран. Инсталирайте го с: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Неуспешно задаване на стойност за ключ „ {{key}} “ в AsyncStorage',
}
