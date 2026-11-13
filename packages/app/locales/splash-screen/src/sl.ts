import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Slovenian. */
export const sl: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ni podprt s tem ponudnikom začetnega zaslona.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je obvezna, vendar ni nameščena. Namestite jo z: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Ponudnik ni nastavljen. Pokličite `setProvider()` z implementacijo `SplashScreenProvider` (npr. iz `@molecule/app-splash-screen-react-native`).',
}
