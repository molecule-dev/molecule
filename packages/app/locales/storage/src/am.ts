import type { StorageTranslations } from './types.js'

/** Storage translations for Amharic. */
export const am: StorageTranslations = {
  'storage.error.noProvider': 'የማከማቻ አቅራቢ አልተዋቀረም። መጀመሪያ setProvider() ይደውሉ።',
  'storage.error.quotaExceeded': 'ቁልፍ "{{key}}" ን ሲያስቀምጡ የማከማቻ ኮታ አልፏል',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` አልተጫነም። በሚከተለው መንገድ ይጫኑት፦ `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'በ AsyncStorage ውስጥ ለቁልፍ " {{key}} " እሴት ማዘጋጀት አልተሳካም',
}
