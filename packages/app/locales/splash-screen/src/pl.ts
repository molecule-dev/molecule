import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Polish. */
export const pl: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() nie jest obsługiwane przez tego dostawcę ekranu powitalnego.',
  'splashScreen.error.missingDependency':
    '`{{library}}` jest wymagana, ale nie jest zainstalowana. Zainstaluj ją za pomocą: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nie ustawiono dostawcy. Wywołaj `setProvider()` z implementacją `SplashScreenProvider` (np. z `@molecule/app-splash-screen-react-native`).',
}
