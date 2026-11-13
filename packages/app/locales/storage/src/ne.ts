import type { StorageTranslations } from './types.js'

/** Storage translations for Nepali. */
export const ne: StorageTranslations = {
  'storage.error.noProvider':
    'भण्डारण प्रदायक कन्फिगर गरिएको छैन। पहिले setProvider() कल गर्नुहोस्।',
  'storage.error.quotaExceeded': '"{{key}}" कुञ्जी सेट गर्दा भण्डारण कोटा भन्दा बढी भयो',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` स्थापना गरिएको छैन। यसलाई `npm install @react-native-async-storage/async-storage` प्रयोग गरेर स्थापना गर्नुहोस्।',
  'storage.error.setFailed': 'AsyncStorage मा " {{key}} " कुञ्जीको लागि मान सेट गर्न असफल भयो।',
}
