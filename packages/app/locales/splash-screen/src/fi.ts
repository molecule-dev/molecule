import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Finnish. */
export const fi: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Aloitusnäytön tarjoajaa ei ole määritetty.',
  'splashScreen.warn.configureNotSupported':
    'configure() ei ole tuettu tämän aloitusnäytön tarjoajan toimesta.',
  'splashScreen.error.missingDependency':
    '`{{library}}` on pakollinen, mutta sitä ei ole asennettu. Asenna se komennolla: `npx expo install {{library}}`',
}
