import type { SplashScreenTranslations } from './types.js'

/** SplashScreen translations for ca. */
export const ca: Partial<SplashScreenTranslations> = {
  'splashScreen.error.noProvider': "El proveïdor de la pantalla d'inici no està configurat.",
  'splashScreen.warn.configureNotSupported':
    'configure() no és compatible amb aquest proveïdor de pantalla de presentació.',
  'splashScreen.error.missingDependency':
    '`{{library}}` és obligatori però no està instal·lat. Instal·leu-lo amb: `npx expo install {{library}}`',
}
