import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Italian. */
export const it: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Il provider della schermata di avvio non è configurato.',
  'splashScreen.warn.configureNotSupported':
    'configure() non è supportato da questo provider della schermata di avvio.',
  'splashScreen.error.missingDependency':
    '`{{library}}` è richiesto ma non installato. Installalo con: `npx expo install {{library}}`',
}
