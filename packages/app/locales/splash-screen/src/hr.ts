import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Croatian. */
export const hr: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() nije podržan od strane ovog pružatelja početnog zaslona.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga s: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nije postavljen pružatelj usluga. Pozovite `setProvider()` s implementacijom `SplashScreenProvider` (npr. iz `@molecule/app-splash-screen-react-native`).',
}
