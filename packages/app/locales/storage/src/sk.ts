import type { StorageTranslations } from './types.js'

/** Storage translations for Slovak. */
export const sk: StorageTranslations = {
  'storage.error.noProvider':
    'Poskytovateľ úložiska nie je nakonfigurovaný. Najprv zavolajte setProvider().',
  'storage.error.quotaExceeded': 'Kvóta úložiska bola prekročená pri nastavovaní kľúča "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nie je nainštalovaný. Nainštalujte ho pomocou: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Nepodarilo sa nastaviť hodnotu pre kľúč „ {{key}} “ v AsyncStorage',
}
