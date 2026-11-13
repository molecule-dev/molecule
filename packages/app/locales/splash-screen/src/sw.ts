import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Swahili. */
export const sw: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() haitumiki na mtoa huduma huyu wa skrini ya kuanza.',
  'splashScreen.error.missingDependency':
    '`{{library}}` inahitajika lakini haijasakinishwa. Isakinishe na: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Hakuna mtoa huduma aliyewekwa. Piga simu `setProvider()` kwa kutumia utekelezaji wa `SplashScreenProvider` (km, kutoka `@molecule/app-splash-screen-react-native`).',
}
