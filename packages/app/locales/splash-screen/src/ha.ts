import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Hausa. */
export const ha: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ba shi da goyon bayan wannan mai ba da allon farawa.',
  'splashScreen.error.missingDependency':
    'Ana buƙatar `{{library}}` amma ba a shigar da shi ba. Shigar da shi da: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Babu saitin mai bada sabis. Kira `setProvider()` tare da aiwatar da `SplashScreenProvider` (misali, daga `@molecule/app-splash-screen-react-native`).',
}
