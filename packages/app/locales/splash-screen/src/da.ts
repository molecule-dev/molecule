import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Danish. */
export const da: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Splash screen-udbyder er ikke konfigureret.',
  'splashScreen.warn.configureNotSupported':
    'configure() understøttes ikke af denne splash screen-udbyder.',
  'splashScreen.error.missingDependency':
    '`{{library}}` er påkrævet, men ikke installeret. Installer det med: `npx expo install {{library}}`',
}
