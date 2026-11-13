import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Turkish. */
export const tr: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() bu açılış ekranı sağlayıcısı tarafından desteklenmiyor.',
  'splashScreen.error.missingDependency':
    '`{{library}}` kütüphanesi gereklidir ancak yüklü değil. Şu komutla yükleyin: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Sağlayıcı ayarlanmadı. `setProvider()` bir `SplashScreenProvider` uygulamasıyla (örneğin, `@molecule/app-splash-screen-react-native`) çağırın.',
}
