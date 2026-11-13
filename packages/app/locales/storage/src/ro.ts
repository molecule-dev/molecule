import type { StorageTranslations } from './types.js'

/** Storage translations for Romanian. */
export const ro: StorageTranslations = {
  'storage.error.noProvider':
    'Furnizorul de stocare nu este configurat. Apelați mai întâi setProvider().',
  'storage.error.quotaExceeded': 'Cota de stocare depășită la setarea cheii "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nu este instalat. Instalați-l cu: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Nu s-a putut seta valoarea pentru cheia „ {{key}} ” în AsyncStorage',
}
