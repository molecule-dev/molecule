import type { StorageTranslations } from './types.js'

/** Storage translations for Punjabi. */
export const pa: StorageTranslations = {
  'storage.error.noProvider': 'ਸਟੋਰੇਜ ਪ੍ਰੋਵਾਈਡਰ ਕੌਂਫਿਗਰ ਨਹੀਂ ਹੈ। ਪਹਿਲਾਂ setProvider() ਕਾਲ ਕਰੋ।',
  'storage.error.quotaExceeded': '"{{key}}" ਕੁੰਜੀ ਸੈੱਟ ਕਰਦੇ ਸਮੇਂ ਸਟੋਰੇਜ ਕੋਟਾ ਪਾਰ ਹੋ ਗਿਆ',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ਇੰਸਟਾਲ ਨਹੀਂ ਹੈ। ਇਸਨੂੰ ਇਸ ਨਾਲ ਇੰਸਟਾਲ ਕਰੋ: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage ਵਿੱਚ " {{key}} " ਕੁੰਜੀ ਲਈ ਮੁੱਲ ਸੈੱਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
}
