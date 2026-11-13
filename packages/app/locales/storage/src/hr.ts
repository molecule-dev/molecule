import type { StorageTranslations } from './types.js'

/** Storage translations for Croatian. */
export const hr: StorageTranslations = {
  'storage.error.noProvider': 'Pružatelj pohrane nije konfiguriran. Prvo pozovite setProvider().',
  'storage.error.quotaExceeded': 'Kvota pohrane prekoračena pri postavljanju ključa "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nije instaliran. Instalirajte ga s: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Nije uspjelo postavljanje vrijednosti za ključ " {{key}} " u AsyncStorageu',
}
