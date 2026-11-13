import type { StorageTranslations } from './types.js'

/** Storage translations for English. */
export const en: StorageTranslations = {
  'storage.error.noProvider': 'Storage provider not configured. Call setProvider() first.',
  'storage.error.quotaExceeded': 'Storage quota exceeded when setting key "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` is not installed. Install it with: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Failed to set value for key "{{key}}" in AsyncStorage',
}
