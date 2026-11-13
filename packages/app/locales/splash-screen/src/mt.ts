import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Maltese. */
export const mt: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() mhux supportat minn dan il-provajder tal-iskrin tal-bidu.',
  'splashScreen.error.missingDependency':
    "`{{library}}` hija meħtieġa iżda mhux installata. Installaha b': `npx expo install {{library}}`",
  'splashScreen.error.noProvider':
    "`@molecule/app-splash-screen`: L-ebda fornitur ma ġie stabbilit. Sejħa `setProvider()` b'implimentazzjoni ta `SplashScreenProvider` (eż., minn `@molecule/app-splash-screen-react-native`).",
}
