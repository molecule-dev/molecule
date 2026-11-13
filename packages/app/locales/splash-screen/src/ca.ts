import type { SplashScreenTranslations } from './types.js'

/** SplashScreen translations for ca. */
export const ca: Partial<SplashScreenTranslations> = {
  'splashScreen.warn.configureNotSupported':
    'configure() no és compatible amb aquest proveïdor de pantalla de presentació.',
  'splashScreen.error.missingDependency':
    '`{{library}}` és obligatori però no està instal·lat. Instal·leu-lo amb: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    "`@molecule/app-splash-screen`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `SplashScreenProvider` (per exemple, des de `@molecule/app-splash-screen-react-native`).",
}
