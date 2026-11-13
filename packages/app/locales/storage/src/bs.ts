import type { StorageTranslations } from './types.js'

/** Storage translations for Bosnian. */
export const bs: StorageTranslations = {
  'storage.error.noProvider':
    'Pružalac skladištenja nije konfigurisan. Pozovite setProvider() prvo.',
  'storage.error.quotaExceeded': 'Kvota skladištenja prekoračena pri postavljanju ključa "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nije instaliran. Instalirajte ga sa: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Nije uspjelo postaviti vrijednost za ključ " {{key}} " u AsyncStorage-u',
}
