import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Hungarian. */
export const hu: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'A configure() nem támogatott ezen kezdőképernyő szolgáltató által.',
  'splashScreen.error.missingDependency':
    '`{{library}}` kötelező, de nincs telepítve. Telepítse a következő paranccsal: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nincs beállítva szolgáltató. Hívja meg `setProvider()` függvényt egy `SplashScreenProvider` implementációval (pl. `@molecule/app-splash-screen-react-native` ből).',
}
