import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Italian. */
export const it: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() non è supportato da questo provider della schermata di avvio.',
  'splashScreen.error.missingDependency':
    '`{{library}}` è richiesto ma non installato. Installalo con: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    "`@molecule/app-splash-screen`: Nessun provider impostato. Chiama `setProvider()` con un'implementazione di `SplashScreenProvider` (ad esempio, da `@molecule/app-splash-screen-react-native`).",
}
