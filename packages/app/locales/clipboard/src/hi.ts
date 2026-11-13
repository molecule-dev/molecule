import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Hindi. */
export const hi: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: कोई प्रदाता सेट नहीं है। ClipboardProvider कार्यान्वयन के साथ setProvider() कॉल करें (उदा., @molecule/app-clipboard-react-native से)।',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange प्रदाता द्वारा समर्थित नहीं है',
  'clipboard.error.missingDependency':
    '`{{library}}` आवश्यक है लेकिन स्थापित नहीं है। इसे निम्न कमांड से स्थापित करें: `npm install {{library}}`',
}
