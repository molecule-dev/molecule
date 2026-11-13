import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Indonesian. */
export const id: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() tidak didukung oleh provider splash screen ini.',
  'splashScreen.error.missingDependency':
    '`{{library}}` diperlukan tetapi belum terpasang. Pasang dengan: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Tidak ada provider yang ditetapkan. Panggil `setProvider()` dengan implementasi `SplashScreenProvider` (misalnya, dari `@molecule/app-splash-screen-react-native`).',
}
