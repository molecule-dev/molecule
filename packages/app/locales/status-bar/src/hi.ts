import type { StatusBarTranslations } from './types.js'

/** Status Bar translations for Hindi. */
export const hi: StatusBarTranslations = {
  'statusBar.error.noProvider':
    '@molecule/app-status-bar: कोई प्रदाता सेट नहीं है। StatusBarProvider कार्यान्वयन के साथ setProvider() कॉल करें (उदा., @molecule/app-status-bar-react-native से)।',
  'statusBar.error.missingDependency': '`{{library}}` आवश्यक है लेकिन स्थापित नहीं है।',
}
