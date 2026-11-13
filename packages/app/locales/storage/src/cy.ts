import type { StorageTranslations } from './types.js'

/** Storage translations for Welsh. */
export const cy: StorageTranslations = {
  'storage.error.noProvider': 'Darparwr storio heb ei ffurfweddu. Galwch setProvider() yn gyntaf.',
  'storage.error.quotaExceeded': 'Cwota storio wedi\'i ragori wrth osod allwedd "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    "Nid yw `@react-native-async-storage/async-storage` wedi'i osod. Gosodwch ef gyda: `npm install @react-native-async-storage/async-storage`",
  'storage.error.setFailed': 'Methwyd gosod gwerth ar gyfer yr allwedd " {{key}} " yn AsyncStorage',
}
