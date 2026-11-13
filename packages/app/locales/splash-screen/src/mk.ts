import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Macedonian. */
export const mk: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() не е поддржан од овој провајдер за почетен екран.',
  'splashScreen.error.missingDependency':
    '`{{library}}` е задолжително, но не е инсталирано. Инсталирајте го со: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Не е поставен провајдер. Повикајте `setProvider()` со имплементација на `SplashScreenProvider` (на пр., од `@molecule/app-splash-screen-react-native`).',
}
