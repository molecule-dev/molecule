import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Basque. */
export const eu: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Hasierako pantailaren hornitzailea ez dago konfiguratuta.',
  'splashScreen.warn.configureNotSupported':
    'configure() ez da onartzen hasierako pantailaren hornitzaile honek.',
  'splashScreen.error.missingDependency':
    '`{{library}}` beharrezkoa da baina ez dago instalatuta. Instalatu `npx expo install {{library}}` komandoarekin',
}
