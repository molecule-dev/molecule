import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Persian. */
export const fa: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: هیچ ارائه‌دهنده‌ای تنظیم نشده است. setProvider() را با یک پیاده‌سازی ClipboardProvider فراخوانی کنید (مثلاً از @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange توسط ارائه‌دهنده پشتیبانی نمی‌شود',
  'clipboard.error.missingDependency':
    '`{{library}}` مورد نیاز است اما نصب نشده است. آن را با دستور زیر نصب کنید: `npm install {{library}}`',
}
