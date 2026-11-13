import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Bulgarian. */
export const bg: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() не се поддържа от този доставчик на начален екран.',
  'splashScreen.error.missingDependency':
    '`{{library}}` е задължителна, но не е инсталирана. Инсталирайте я с: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Няма зададен доставчик. Извикайте `setProvider()` с имплементация на `SplashScreenProvider` (напр. от `@molecule/app-splash-screen-react-native`).',
}
