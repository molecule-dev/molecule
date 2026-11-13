import type { StorageTranslations } from './types.js'

/** Storage translations for German. */
export const de: StorageTranslations = {
  'storage.error.noProvider':
    'Speicheranbieter nicht konfiguriert. Rufen Sie zuerst setProvider() auf.',
  'storage.error.quotaExceeded':
    'Speicherkontingent beim Setzen des Schlüssels "{{key}}" überschritten',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ist nicht installiert. Installieren Sie es mit: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'Fehler beim Festlegen des Werts für den Schlüssel " {{key}} " in AsyncStorage',
}
