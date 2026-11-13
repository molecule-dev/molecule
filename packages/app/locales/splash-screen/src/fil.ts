import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Filipino. */
export const fil: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'Hindi sinusuportahan ang configure() ng splash screen provider na ito.',
  'splashScreen.error.missingDependency':
    'Kinakailangan ang `{{library}}` ngunit hindi pa naka-install. I-install ito gamit ang: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Walang nakatakdang provider. Tawagin `setProvider()` gamit ang isang implementasyong `SplashScreenProvider` (hal., mula sa `@molecule/app-splash-screen-react-native`).',
}
