import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Armenian. */
export const hy: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() chesupportavorvum ays oghjuyn ekrani provayderov.',
  'splashScreen.error.missingDependency':
    '`{{library}}` պարտադիր է, բայց տեղադրված չէ։ Տեղադրեք այն՝ `npx expo install {{library}}` ով։',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Մատակարար սահմանված չէ: Կանչեք `setProvider()` ը `SplashScreenProvider` իրականացմամբ (օրինակ՝ `@molecule/app-splash-screen-react-native` ից):',
}
