import type { StorageTranslations } from './types.js'

/** Storage translations for Hindi. */
export const hi: StorageTranslations = {
  'storage.error.noProvider':
    'स्टोरेज प्रोवाइडर कॉन्फ़िगर नहीं किया गया है। पहले setProvider() कॉल करें।',
  'storage.error.quotaExceeded': '"{{key}}" कुंजी सेट करते समय स्टोरेज कोटा पार हो गया',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` इंस्टॉल नहीं है। इसे निम्न कमांड से इंस्टॉल करें: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage में कुंजी " {{key}} " के लिए मान सेट करने में विफल',
}
