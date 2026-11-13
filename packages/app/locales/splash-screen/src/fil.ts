import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Filipino. */
export const fil: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Hindi naka-configure ang splash screen provider.',
  'splashScreen.warn.configureNotSupported':
    'Hindi sinusuportahan ang configure() ng splash screen provider na ito.',
  'splashScreen.error.missingDependency':
    'Kinakailangan ang `{{library}}` ngunit hindi pa naka-install. I-install ito gamit ang: `npx expo install {{library}}`',
}
