import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Latvian. */
export const lv: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Nav iestatīts pakalpojumu sniedzējs. Izsauciet setProvider() ar ClipboardProvider implementāciju (piem., no @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange netiek atbalstīts no pakalpojumu sniedzēja puses',
}
