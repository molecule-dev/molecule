import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Afrikaans. */
export const af: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Spatskermverskaffer is nie gekonfigureer nie.',
  'splashScreen.warn.configureNotSupported':
    'configure() word nie deur hierdie spatskermverskaffer ondersteun nie.',
  'splashScreen.error.missingDependency':
    '`{{library}}` word vereis, maar is nie geïnstalleer nie. Installeer dit met: `npx expo install {{library}}`',
}
