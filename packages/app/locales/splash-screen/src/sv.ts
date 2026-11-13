import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Swedish. */
export const sv: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() stöds inte av denna startskärmsleverantör.',
  'splashScreen.error.missingDependency':
    '`{{library}}` krävs men är inte installerat. Installera det med: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Ingen provider angiven. Anropa `setProvider()` med en `SplashScreenProvider`-implementering (t.ex. från `@molecule/app-splash-screen-react-native`).',
}
