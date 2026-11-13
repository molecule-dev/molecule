import type { StorageTranslations } from './types.js'

/** Storage translations for Italian. */
export const it: StorageTranslations = {
  'storage.error.noProvider':
    'Provider di archiviazione non configurato. Chiamare prima setProvider().',
  'storage.error.quotaExceeded':
    'Quota di archiviazione superata durante l\'impostazione della chiave "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` non è installato. Installalo con: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Impossibile impostare il valore per la chiave " {{key}} " in AsyncStorage',
}
