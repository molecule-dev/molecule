import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Kyrgyz. */
export const ky: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Баштоо экраны провайдери конфигурацияланган эмес.',
  'splashScreen.warn.configureNotSupported':
    'configure() бул баштоо экраны провайдери тарабынан колдоого алынбайт.',
  'splashScreen.error.missingDependency':
    '`{{library}}` талап кылынат, бирок орнотулган эмес. Аны төмөнкү менен орнотуңуз: `npx expo install {{library}}`',
}
