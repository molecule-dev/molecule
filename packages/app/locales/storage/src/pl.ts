import type { StorageTranslations } from './types.js'

/** Storage translations for Polish. */
export const pl: StorageTranslations = {
  'storage.error.noProvider':
    'Dostawca pamięci nie jest skonfigurowany. Wywołaj najpierw setProvider().',
  'storage.error.quotaExceeded': 'Przekroczono limit pamięci podczas ustawiania klucza "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nie jest zainstalowany. Zainstaluj go poleceniem: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Nie udało się ustawić wartości klucza „ {{key}} ” w AsyncStorage',
}
