import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Telugu. */
export const te: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: ప్రొవైడర్ సెట్ చేయబడలేదు. ClipboardProvider అమలుతో setProvider() కాల్ చేయండి (ఉదా., @molecule/app-clipboard-react-native నుండి).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ప్రొవైడర్ ద్వారా మద్దతు లేదు',
  'clipboard.error.missingDependency':
    '`{{library}}` అవసరం, కానీ ఇన్‌స్టాల్ చేయబడలేదు. దీనిని `npm install {{library}}` తో ఇన్‌స్టాల్ చేయండి.',
}
