import type { StorageTranslations } from './types.js'

/** Storage translations for Sinhala. */
export const si: StorageTranslations = {
  'storage.error.noProvider': 'ගබඩා සැපයුම්කරු වින්‍යාස කර නැත. පළමුව setProvider() අමතන්න.',
  'storage.error.quotaExceeded': '"{{key}}" යතුර සකසන විට ගබඩා ප්‍රමාණය ඉක්මවා ඇත',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ස්ථාපනය කර නැත. එය ස්ථාපනය කරන්න: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage හි " {{key}} " යතුර සඳහා අගය සැකසීමට අසමත් විය.',
}
