import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Afrikaans. */
export const af: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() word nie deur hierdie spatskermverskaffer ondersteun nie.',
  'splashScreen.error.missingDependency':
    '`{{library}}` word vereis, maar is nie geïnstalleer nie. Installeer dit met: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    "`@molecule/app-splash-screen`: Geen verskaffer gestel nie. Roep `setProvider()` met 'n `SplashScreenProvider` implementering (bv. vanaf `@molecule/app-splash-screen-react-native`).",
}
