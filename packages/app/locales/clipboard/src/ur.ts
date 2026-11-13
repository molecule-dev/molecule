import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Urdu. */
export const ur: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: کوئی فراہم کنندہ سیٹ نہیں ہے۔ ClipboardProvider کے نفاذ کے ساتھ setProvider() کو کال کریں (مثلاً، @molecule/app-clipboard-react-native سے)۔',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange فراہم کنندہ کی طرف سے تعاون یافتہ نہیں ہے',
  'clipboard.error.missingDependency':
    '`{{library}}` درکار ہے لیکن انسٹال نہیں ہے۔ اسے اس کے ساتھ انسٹال کریں: `npm install {{library}}`',
}
