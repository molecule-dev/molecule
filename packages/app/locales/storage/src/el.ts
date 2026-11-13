import type { StorageTranslations } from './types.js'

/** Storage translations for Greek. */
export const el: StorageTranslations = {
  'storage.error.noProvider':
    'Ο πάροχος αποθήκευσης δεν έχει ρυθμιστεί. Καλέστε πρώτα setProvider().',
  'storage.error.quotaExceeded':
    'Υπέρβαση ορίου αποθήκευσης κατά τον ορισμό του κλειδιού "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` δεν είναι εγκατεστημένο. Εγκαταστήστε το με: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Αποτυχία ορισμού τιμής για το κλειδί " {{key}} " στο AsyncStorage',
}
