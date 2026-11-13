import type { StorageTranslations } from './types.js'

/** Storage translations for Irish. */
export const ga: StorageTranslations = {
  'storage.error.noProvider': 'Soláthraí stórais gan a chumrú. Glaoigh ar setProvider() ar dtús.',
  'storage.error.quotaExceeded': 'Cuóta stórais sáraithe agus eochair "{{key}}" á socrú',
  'storage.error.asyncStorageUnavailable':
    'Níl `@react-native-async-storage/async-storage` suiteáilte. Suiteáil é le: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Theip ar luach a shocrú don eochair " {{key}} " in AsyncStorage',
}
