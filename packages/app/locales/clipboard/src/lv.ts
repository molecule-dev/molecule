import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Latvian. */
export const lv: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Nav iestatīts pakalpojumu sniedzējs. Izsauciet setProvider() ar ClipboardProvider implementāciju (piem., no @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange netiek atbalstīts no pakalpojumu sniedzēja puses',
  'clipboard.error.missingDependency':
    '`{{library}}` ir obligāta, bet nav instalēta. Instalējiet to, izmantojot: `npm install {{library}}`',
}
