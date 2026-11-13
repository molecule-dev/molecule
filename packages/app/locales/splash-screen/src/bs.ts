import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Bosnian. */
export const bs: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() nije podržan od strane ovog providera početnog ekrana.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga sa: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nije postavljen provajder. Pozovite `setProvider()` sa implementacijom `SplashScreenProvider` (npr. iz `@molecule/app-splash-screen-react-native`).',
}
