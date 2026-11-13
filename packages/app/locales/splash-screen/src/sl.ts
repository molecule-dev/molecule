import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Slovenian. */
export const sl: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Ponudnik začetnega zaslona ni nastavljen.',
  'splashScreen.warn.configureNotSupported':
    'configure() ni podprt s tem ponudnikom začetnega zaslona.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je obvezna, vendar ni nameščena. Namestite jo z: `npx expo install {{library}}`',
}
