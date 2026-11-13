import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Norwegian Bokmål. */
export const nb: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() støttes ikke av denne oppstartsskjerm-leverandøren.',
  'splashScreen.error.missingDependency':
    '`{{library}}` er nødvendig, men ikke installert. Installer det med: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Ingen leverandør angitt. Kall `setProvider()` med en `SplashScreenProvider`-implementering (f.eks. fra `@molecule/app-splash-screen-react-native`).',
}
