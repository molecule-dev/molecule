import type { StorageTranslations } from './types.js'

/** Storage translations for Khmer. */
export const km: StorageTranslations = {
  'storage.error.noProvider':
    'អ្នកផ្តល់សេវាផ្ទុកមិនបានកំណត់រចនាសម្ព័ន្ធទេ។ ហៅ setProvider() ជាមុនសិន។',
  'storage.error.quotaExceeded': 'កូតាការផ្ទុកហួសពេលកំណត់គន្លឹះ "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` មិនត្រូវបានដំឡើងទេ។ ដំឡើងវាជាមួយ៖ `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'មិនអាចកំណត់តម្លៃសម្រាប់សោ " {{key}} " នៅក្នុង AsyncStorage បានទេ',
}
