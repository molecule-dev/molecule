import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Spanish. */
export const es: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() no es compatible con este proveedor de pantalla de inicio.',
  'splashScreen.error.missingDependency':
    '`{{library}}` es necesaria pero no está instalada. Instálela con: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: No se ha establecido ningún proveedor. Llame `setProvider()` con una implementación de `SplashScreenProvider` (por ejemplo, de `@molecule/app-splash-screen-react-native`).',
}
