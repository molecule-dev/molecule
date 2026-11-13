import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Bosnian. */
export const bs: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Provider početnog ekrana nije konfigurisan.',
  'splashScreen.warn.configureNotSupported':
    'configure() nije podržan od strane ovog providera početnog ekrana.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga sa: `npx expo install {{library}}`',
}
