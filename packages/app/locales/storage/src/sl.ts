import type { StorageTranslations } from './types.js'

/** Storage translations for Slovenian. */
export const sl: StorageTranslations = {
  'storage.error.noProvider':
    'Ponudnik shranjevanja ni nastavljen. Najprej pokličite setProvider().',
  'storage.error.quotaExceeded': 'Kvota shranjevanja presežena pri nastavljanju ključa "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ni nameščen. Namestite ga z: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Vrednosti za ključ » {{key}} « v AsyncStorage ni bilo mogoče nastaviti.',
}
