import type { StorageTranslations } from './types.js'

/** Storage translations for Hebrew. */
export const he: StorageTranslations = {
  'storage.error.noProvider': 'ספק אחסון לא מוגדר. קרא ל-setProvider() קודם.',
  'storage.error.quotaExceeded': 'חריגה ממכסת האחסון בעת הגדרת מפתח "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` לא מותקן. התקן אותו עם: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'נכשל בהגדרת הערך עבור המפתח " {{key}} " ב-AsyncStorage',
}
