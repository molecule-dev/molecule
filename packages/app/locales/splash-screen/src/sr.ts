import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Serbian. */
export const sr: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() није подржан овим провајдером почетног екрана.',
  'splashScreen.error.missingDependency':
    '`{{library}}` је потребан, али није инсталиран. Инсталирајте га помоћу: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Није подешен провајдер. Позовите `setProvider()` са имплементацијом `SplashScreenProvider` (нпр. из `@molecule/app-splash-screen-react-native`).',
}
