import type { StorageTranslations } from './types.js'

/** Storage translations for Yoruba. */
export const yo: StorageTranslations = {
  'storage.error.noProvider': 'A ko ti tunto olupese ibi ipamọ. Pe setProvider() ni akọkọ.',
  'storage.error.quotaExceeded': 'Iwọn ibi ipamọ ti kọja nigba ti o n ṣeto bọtini "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    'A kò fi `@react-native-async-storage/async-storage` sori ẹrọ. Fi sori ẹrọ pẹlu: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Kò ṣeé ṣe láti ṣètò iye fún kọ́kọ́rọ́ " {{key}} " nínú AsyncStorage',
}
