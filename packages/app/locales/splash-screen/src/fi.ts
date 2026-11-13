import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Finnish. */
export const fi: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ei ole tuettu tämän aloitusnäytön tarjoajan toimesta.',
  'splashScreen.error.missingDependency':
    '`{{library}}` on pakollinen, mutta sitä ei ole asennettu. Asenna se komennolla: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Ei määritettyä toimittajaa. Kutsu `setProvider()` -funktiota `SplashScreenProvider` -toteutuksella (esim. `@molecule/app-splash-screen-react-native`).',
}
