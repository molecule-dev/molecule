import type { StorageTranslations } from './types.js'

/** Storage translations for Latvian. */
export const lv: StorageTranslations = {
  'storage.error.noProvider':
    'Glabātuves nodrošinātājs nav konfigurēts. Vispirms izsauciet setProvider().',
  'storage.error.quotaExceeded': 'Glabātuves kvota pārsniegta, iestatot atslēgu "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nav instalēts. Instalējiet to ar: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Neizdevās iestatīt atslēgas " {{key}} " vērtību AsyncStorage failā.',
}
