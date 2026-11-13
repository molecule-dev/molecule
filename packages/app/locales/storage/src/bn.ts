import type { StorageTranslations } from './types.js'

/** Storage translations for Bengali. */
export const bn: StorageTranslations = {
  'storage.error.noProvider': 'স্টোরেজ প্রোভাইডার কনফিগার করা হয়নি। প্রথমে setProvider() কল করুন।',
  'storage.error.quotaExceeded': '"{{key}}" কী সেট করার সময় স্টোরেজ কোটা অতিক্রম করেছে',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ইনস্টল করা নেই। এটি ইনস্টল করুন: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'AsyncStorage-এ " {{key}} " কী-এর জন্য মান সেট করতে ব্যর্থ হয়েছে',
}
