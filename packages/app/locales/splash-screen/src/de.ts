import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for German. */
export const de: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() wird von diesem Startbildschirm-Anbieter nicht unterstützt.',
  'splashScreen.error.missingDependency':
    '`{{library}}` wird benötigt, ist aber nicht installiert. Installieren Sie sie mit: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Kein Provider festgelegt. Rufen Sie `setProvider()` mit einer `SplashScreenProvider`-Implementierung auf (z. B. von `@molecule/app-splash-screen-react-native`).',
}
