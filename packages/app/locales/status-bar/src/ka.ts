import type { StatusBarTranslations } from './types.js'

/** Status Bar translations for Georgian. */
export const ka: StatusBarTranslations = {
  'statusBar.error.noProvider':
    '@molecule/app-status-bar: პროვაიდერი არ არის დაყენებული. გამოიძახეთ setProvider() StatusBarProvider იმპლემენტაციით (მაგ., @molecule/app-status-bar-react-native-იდან).',
  'statusBar.error.missingDependency': '`{{library}}` აუცილებელია, მაგრამ არ არის დაინსტალირებული.',
}
