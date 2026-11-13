import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Kyrgyz. */
export const ky: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() бул баштоо экраны провайдери тарабынан колдоого алынбайт.',
  'splashScreen.error.missingDependency':
    '`{{library}}` талап кылынат, бирок орнотулган эмес. Аны төмөнкү менен орнотуңуз: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Провайдер коюлган эмес. `setProvider()` `SplashScreenProvider` реализациясы менен чакырыңыз (мисалы, `@molecule/app-splash-screen-react-native` функциясынан).',
}
