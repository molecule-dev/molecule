import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Arabic. */
export const ar: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: لم يتم تعيين مزود. قم باستدعاء setProvider() مع تنفيذ ClipboardProvider (مثلاً من @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange غير مدعوم من قبل المزود',
}
