import type { StatusBarTranslations } from './types.js'

/** Status Bar translations for Icelandic. */
export const is: StatusBarTranslations = {
  'statusBar.error.noProvider':
    '@molecule/app-status-bar: Enginn þjónustuaðili stilltur. Kallaðu á setProvider() með StatusBarProvider útfærslu (t.d. frá @molecule/app-status-bar-react-native).',
  'statusBar.error.missingDependency': '`{{library}}` er krafist en ekki uppsett.',
}
