import type { StorageTranslations } from './types.js'

/** Storage translations for Hungarian. */
export const hu: StorageTranslations = {
  'storage.error.noProvider':
    'A tárolási szolgáltató nincs beállítva. Először hívja meg a setProvider()-t.',
  'storage.error.quotaExceeded': 'Tárolási kvóta túllépve a(z) "{{key}}" kulcs beállításakor',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nincs telepítve. Telepítse a következő paranccsal: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Nem sikerült beállítani a(z) " {{key}} " kulcs értékét az AsyncStorage-ban.',
}
