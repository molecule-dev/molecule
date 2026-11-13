import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Yoruba. */
export const yo: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() kò ní àtìlẹ́yìn látọ̀dọ̀ olùpèsè ojú ìbọ̀ ìbẹ̀rẹ̀ yìí.',
  'splashScreen.error.missingDependency':
    '`{{library}}` pọndandan ṣùgbọ́n a kò fi sori ẹrọ. Fi sori ẹrọ pẹlu: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Kò sí ètò olùpèsè. Pe `setProvider()` pẹ̀lú ìmúṣẹ `SplashScreenProvider` (fún àpẹẹrẹ, láti `@molecule/app-splash-screen-react-native`).',
}
