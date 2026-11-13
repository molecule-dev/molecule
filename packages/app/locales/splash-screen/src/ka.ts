import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Georgian. */
export const ka: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ar aris mkhardalchebuli am dasatskisi ekranis provaideriT.',
  'splashScreen.error.missingDependency':
    '`{{library}}` აუცილებელია, მაგრამ არ არის დაინსტალირებული. დააინსტალირეთ ის: `npx expo install {{library}}` ით',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: პროვაიდერი არ არის დაყენებული. გამოიძახეთ `setProvider()` `SplashScreenProvider` იმპლემენტაციით (მაგ., `@molecule/app-splash-screen-react-native` დან).',
}
