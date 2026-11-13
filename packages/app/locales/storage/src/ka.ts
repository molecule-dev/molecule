import type { StorageTranslations } from './types.js'

/** Storage translations for Georgian. */
export const ka: StorageTranslations = {
  'storage.error.noProvider':
    'საცავის პროვაიდერი კონფიგურირებული არ არის. ჯერ გამოიძახეთ setProvider().',
  'storage.error.quotaExceeded': 'საცავის კვოტა გადაჭარბებულია "{{key}}" გასაღების დაყენებისას',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` არ არის დაინსტალირებული. დააინსტალირეთ: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'AsyncStorage-ში გასაღებისთვის „ {{key}} “ მნიშვნელობის დაყენება ვერ მოხერხდა',
}
