import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Dutch. */
export const nl: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() wordt niet ondersteund door deze splash screen-provider.',
  'splashScreen.error.missingDependency':
    '`{{library}}` is vereist, maar niet geïnstalleerd. Installeer het met: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Er is geen provider ingesteld. Roep `setProvider()` aan met een `SplashScreenProvider`-implementatie (bijvoorbeeld van `@molecule/app-splash-screen-react-native`).',
}
