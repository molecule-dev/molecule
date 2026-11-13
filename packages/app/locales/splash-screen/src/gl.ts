import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Galician. */
export const gl: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() non é compatible con este provedor de pantalla de inicio.',
  'splashScreen.error.missingDependency':
    '`{{library}}` é necesario pero non está instalado. Instálao con: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Non se estableceu ningún provedor. Chama `setProvider()` cunha implementación de `SplashScreenProvider` (por exemplo, desde `@molecule/app-splash-screen-react-native`).',
}
