import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Gujarati. */
export const gu: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: કોઈ પ્રદાતા સેટ નથી. ClipboardProvider અમલીકરણ સાથે setProvider() કૉલ કરો (દા.ત., @molecule/app-clipboard-react-native માંથી).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange પ્રદાતા દ્વારા સમર્થિત નથી',
  'clipboard.error.missingDependency':
    '`{{library}}` જરૂરી છે પણ ઇન્સ્ટોલ કરેલું નથી. તેને આની સાથે ઇન્સ્ટોલ કરો: `npm install {{library}}`',
}
