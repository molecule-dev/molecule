import type { StorageTranslations } from './types.js'

/** Storage translations for Estonian. */
export const et: StorageTranslations = {
  'storage.error.noProvider':
    'Salvestusteenuse pakkuja pole seadistatud. Kutsuge esmalt setProvider().',
  'storage.error.quotaExceeded': 'Salvestuskvoot ületatud võtme "{{key}}" seadmisel',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` pole installitud. Installige see käsuga: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage\'is võtme " {{key}} " väärtuse määramine ebaõnnestus.',
}
