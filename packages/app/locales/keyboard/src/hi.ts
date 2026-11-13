import type { KeyboardTranslations } from './types.js'

/** Keyboard translations for Hindi. */
export const hi: KeyboardTranslations = {
  'keyboard.error.noProvider':
    '@molecule/app-keyboard: कोई प्रदाता सेट नहीं है। KeyboardProvider कार्यान्वयन के साथ setProvider() कॉल करें (उदा., @molecule/app-keyboard-react-native से)।',
  'keyboard.error.missingDependency': '`{{library}}` आवश्यक है लेकिन स्थापित नहीं है।',
}
