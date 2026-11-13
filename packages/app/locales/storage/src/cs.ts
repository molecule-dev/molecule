import type { StorageTranslations } from './types.js'

/** Storage translations for Czech. */
export const cs: StorageTranslations = {
  'storage.error.noProvider':
    'Poskytovatel úložiště není nakonfigurován. Nejprve zavolejte setProvider().',
  'storage.error.quotaExceeded': 'Kvóta úložiště překročena při nastavování klíče "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` není nainstalován. Nainstalujte jej pomocí: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Nepodařilo se nastavit hodnotu pro klíč „ {{key}} “ v AsyncStorage.',
}
