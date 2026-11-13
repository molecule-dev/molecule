import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Sinhala. */
export const si: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: සපයන්නකු සකසා නැත. ClipboardProvider ක්‍රියාත්මක කිරීමක් සමඟ setProvider() අමතන්න (උදා., @molecule/app-clipboard-react-native වෙතින්).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange සපයන්නා විසින් සහාය නොදක්වයි',
  'clipboard.error.missingDependency':
    '`{{library}}` අවශ්‍යයි නමුත් ස්ථාපනය කර නැත. `npm install {{library}}` සමඟ එය ස්ථාපනය කරන්න.',
}
