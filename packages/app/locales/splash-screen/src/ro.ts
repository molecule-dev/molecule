import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Romanian. */
export const ro: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() nu este suportat de acest furnizor al ecranului de pornire.',
  'splashScreen.error.missingDependency':
    '`{{library}}` este obligatoriu, dar nu este instalat. Instalați-l cu: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Niciun furnizor setat. Apelați `setProvider()` cu o implementare a `SplashScreenProvider` (de exemplu, din `@molecule/app-splash-screen-react-native`).',
}
