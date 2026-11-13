import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Estonian. */
export const et: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ei ole selle tervituskuva pakkuja poolt toetatud.',
  'splashScreen.error.missingDependency':
    '`{{library}}` on kohustuslik, aga pole installitud. Installige see käsuga: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Pakkujat pole määratud. Kutsu `setProvider()` välja `SplashScreenProvider` implementatsiooniga (nt `@molecule/app-splash-screen-react-native`).',
}
