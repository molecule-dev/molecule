import type { StorageTranslations } from './types.js'

/** Storage translations for Zulu. */
export const zu: StorageTranslations = {
  'storage.error.noProvider':
    'Umhlinzeki wesitoreji awulungiselelwanga. Shayela setProvider() kuqala.',
  'storage.error.quotaExceeded': 'Isilinganiso sesitoreji sidluliwe lapho usetha ukhiye "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    'I `@react-native-async-storage/async-storage` ayifakiwe. Yifake nge: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Yehlulekile ukusetha inani lokhiye " {{key}} " ku-AsyncStorage',
}
