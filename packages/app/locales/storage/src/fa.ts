import type { StorageTranslations } from './types.js'

/** Storage translations for Persian. */
export const fa: StorageTranslations = {
  'storage.error.noProvider':
    'ارائه‌دهنده ذخیره‌سازی پیکربندی نشده است. ابتدا setProvider() را فراخوانی کنید.',
  'storage.error.quotaExceeded': 'سهمیه ذخیره‌سازی هنگام تنظیم کلید "{{key}}" تجاوز شد',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` نصب نشده است. آن را با دستور زیر نصب کنید: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'تنظیم مقدار برای کلید " {{key}} " در AsyncStorage ناموفق بود',
}
