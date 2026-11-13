import type { StorageTranslations } from './types.js'

/** Storage translations for Hausa. */
export const ha: StorageTranslations = {
  'storage.error.noProvider': 'Ba a saita mai ba da ajiyar ba. Fara kira setProvider().',
  'storage.error.quotaExceeded': 'An wuce adadin ajiyar yayin saita maɓalli "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    'Ba a shigar da `@react-native-async-storage/async-storage` ba. Shigar da shi da: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'An kasa saita ƙimar maɓalli " {{key}} " a cikin AsyncStorage',
}
