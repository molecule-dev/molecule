import type { StorageTranslations } from './types.js'

/** Storage translations for Afrikaans. */
export const af: StorageTranslations = {
  'storage.error.noProvider': 'Bergingverskaffer nie opgestel nie. Roep setProvider() eerste.',
  'storage.error.quotaExceeded': 'Bergingkwota oorskry by die instelling van sleutel "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` is nie geïnstalleer nie. Installeer dit met: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Kon nie waarde vir sleutel " {{key}} " in AsyncStorage stel nie',
}
