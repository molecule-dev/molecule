import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for English. */
export const en: SplashScreenTranslations = {
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: No provider set. Call `setProvider()` with a `SplashScreenProvider` implementation (e.g., from `@molecule/app-splash-screen-react-native`).',
  'splashScreen.warn.configureNotSupported':
    'configure() is not supported by this splash screen provider.',
  'splashScreen.error.missingDependency':
    '`{{library}}` is required but not installed. Install it with: `npx expo install {{library}}`',
}
