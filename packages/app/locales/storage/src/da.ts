import type { StorageTranslations } from './types.js'

/** Storage translations for Danish. */
export const da: StorageTranslations = {
  'storage.error.noProvider': 'Lagringsudbyder ikke konfigureret. Kald setProvider() først.',
  'storage.error.quotaExceeded': 'Lagringskvote overskredet ved indstilling af nøgle "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` er ikke installeret. Installer det med: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Kunne ikke angive værdi for nøglen " {{key}} " i AsyncStorage',
}
