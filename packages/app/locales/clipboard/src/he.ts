import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Hebrew. */
export const he: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: לא הוגדר ספק. קרא ל-setProvider() עם מימוש של ClipboardProvider (למשל, מ-@molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported': '@molecule/app-clipboard: onChange אינו נתמך על ידי הספק',
}
