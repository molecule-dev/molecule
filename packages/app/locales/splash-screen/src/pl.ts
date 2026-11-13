import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Polish. */
export const pl: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Dostawca ekranu powitalnego nie jest skonfigurowany.',
  'splashScreen.warn.configureNotSupported':
    'configure() nie jest obsługiwane przez tego dostawcę ekranu powitalnego.',
  'splashScreen.error.missingDependency':
    '`{{library}}` jest wymagana, ale nie jest zainstalowana. Zainstaluj ją za pomocą: `npx expo install {{library}}`',
}
