import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Azerbaijani. */
export const az: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() bu başlanğıc ekranı provayderi tərəfindən dəstəklənmir.',
  'splashScreen.error.missingDependency':
    '`{{library}}` tələb olunur, lakin quraşdırılmayıb. Bunu bu şəkildə quraşdırın: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Provayder təyin edilməyib. `setProvider()` `SplashScreenProvider` implementasiyası ilə çağırın (məsələn, `@molecule/app-splash-screen-react-native` dən).',
}
