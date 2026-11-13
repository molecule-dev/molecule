import type { StorageTranslations } from './types.js'

/** Storage translations for Swahili. */
export const sw: StorageTranslations = {
  'storage.error.noProvider': 'Mtoa huduma wa hifadhi haijasanidiwa. Piga setProvider() kwanza.',
  'storage.error.quotaExceeded':
    'Kiwango cha hifadhi kimezidishwa wakati wa kuweka ufunguo "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` haijasakinishwa. Isakinishe na: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Imeshindwa kuweka thamani ya ufunguo " {{key}} " katika AsyncStorage',
}
