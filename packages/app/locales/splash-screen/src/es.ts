import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Spanish. */
export const es: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'El proveedor de pantalla de inicio no está configurado.',
  'splashScreen.warn.configureNotSupported':
    'configure() no es compatible con este proveedor de pantalla de inicio.',
  'splashScreen.error.missingDependency':
    '`{{library}}` es necesaria pero no está instalada. Instálela con: `npx expo install {{library}}`',
}
