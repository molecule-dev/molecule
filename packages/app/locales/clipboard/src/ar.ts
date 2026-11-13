import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Arabic. */
export const ar: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: لم يتم تعيين مزود. قم باستدعاء setProvider() مع تنفيذ ClipboardProvider (مثلاً من @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange غير مدعوم من قبل المزود',
  'clipboard.error.missingDependency':
    '`{{library}}` مطلوبة ولكنها غير مثبتة. قم بتثبيتها باستخدام الأمر التالي: `npm install {{library}}`',
}
