import type { StorageTranslations } from './types.js'

/** Storage translations for Urdu. */
export const ur: StorageTranslations = {
  'storage.error.noProvider':
    'اسٹوریج فراہم کنندہ ترتیب نہیں دیا گیا۔ پہلے setProvider() کال کریں۔',
  'storage.error.quotaExceeded': '"{{key}}" کلید سیٹ کرتے وقت اسٹوریج کوٹہ سے تجاوز ہو گیا',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` انسٹال نہیں ہے۔ اسے اس کے ساتھ انسٹال کریں: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage میں کلید " {{key}} " کے لیے قدر مقرر کرنے میں ناکام',
}
