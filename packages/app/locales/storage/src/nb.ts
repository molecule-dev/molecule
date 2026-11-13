import type { StorageTranslations } from './types.js'

/** Storage translations for Norwegian Bokmål. */
export const nb: StorageTranslations = {
  'storage.error.noProvider': 'Lagringstilbyder ikke konfigurert. Kall setProvider() først.',
  'storage.error.quotaExceeded': 'Lagringskvote overskredet ved innstilling av nøkkel "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` er ikke installert. Installer det med: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Kunne ikke angi verdi for nøkkelen « {{key}} » i AsyncStorage',
}
