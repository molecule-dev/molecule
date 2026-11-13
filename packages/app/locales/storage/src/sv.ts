import type { StorageTranslations } from './types.js'

/** Storage translations for Swedish. */
export const sv: StorageTranslations = {
  'storage.error.noProvider': 'Lagringsleverantör inte konfigurerad. Anropa setProvider() först.',
  'storage.error.quotaExceeded': 'Lagringskvoten överskreds vid inställning av nyckel "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` är inte installerat. Installera det med: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Misslyckades med att ange värde för nyckeln " {{key}} " i AsyncStorage',
}
