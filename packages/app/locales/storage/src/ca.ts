import type { StorageTranslations } from './types.js'

/** Storage translations for ca. */
export const ca: Partial<StorageTranslations> = {
  'storage.error.quotaExceeded':
    'S\'ha superat la quota d\'emmagatzematge en establir la clau "{{key}}"',
  'storage.error.noProvider':
    "Proveïdor d'emmagatzematge no configurat. Crida primer setProvider().",
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` no està instal·lat. Instal·leu-lo amb: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'No s\'ha pogut definir el valor de la clau " {{key}} " a l\'emmagatzematge async.',
}
