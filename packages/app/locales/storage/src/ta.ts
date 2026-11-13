import type { StorageTranslations } from './types.js'

/** Storage translations for Tamil. */
export const ta: StorageTranslations = {
  'storage.error.noProvider':
    'சேமிப்பு வழங்குநர் கட்டமைக்கப்படவில்லை. முதலில் setProvider() ஐ அழைக்கவும்.',
  'storage.error.quotaExceeded': '"{{key}}" விசையை அமைக்கும்போது சேமிப்பு ஒதுக்கீடு மீறப்பட்டது',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` நிறுவப்படவில்லை. இதை நிறுவ: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'AsyncStorage-இல் " {{key}} " என்ற சாவிக்கு மதிப்பை அமைக்க முடியவில்லை.',
}
