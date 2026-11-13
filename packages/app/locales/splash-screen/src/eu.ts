import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Basque. */
export const eu: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ez da onartzen hasierako pantailaren hornitzaile honek.',
  'splashScreen.error.missingDependency':
    '`{{library}}` beharrezkoa da baina ez dago instalatuta. Instalatu `npx expo install {{library}}` komandoarekin',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Ez da hornitzailerik ezarri. Deitu `setProvider()` `SplashScreenProvider` inplementazio batekin (adibidez, `@molecule/app-splash-screen-react-native`).',
}
