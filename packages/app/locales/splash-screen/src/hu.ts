import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Hungarian. */
export const hu: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'A kezdőképernyő szolgáltató nincs konfigurálva.',
  'splashScreen.warn.configureNotSupported':
    'A configure() nem támogatott ezen kezdőképernyő szolgáltató által.',
  'splashScreen.error.missingDependency':
    '`{{library}}` kötelező, de nincs telepítve. Telepítse a következő paranccsal: `npx expo install {{library}}`',
}
