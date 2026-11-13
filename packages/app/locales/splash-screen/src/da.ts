import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Danish. */
export const da: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() understøttes ikke af denne splash screen-udbyder.',
  'splashScreen.error.missingDependency':
    '`{{library}}` er påkrævet, men ikke installeret. Installer det med: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Ingen provider angivet. Kald `setProvider()` med en `SplashScreenProvider` implementering (f.eks. fra `@molecule/app-splash-screen-react-native`).',
}
