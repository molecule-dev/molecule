import type { StatusBarTranslations } from './types.js'

/** Status Bar translations for Marathi. */
export const mr: StatusBarTranslations = {
  'statusBar.error.noProvider':
    '@molecule/app-status-bar: कोणताही प्रदाता सेट केलेला नाही. StatusBarProvider अंमलबजावणीसह setProvider() कॉल करा (उदा., @molecule/app-status-bar-react-native कडून).',
  'statusBar.error.missingDependency': '`{{library}}` आवश्यक आहे परंतु स्थापित केलेले नाही.',
}
