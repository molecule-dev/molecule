import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Belarusian. */
export const be: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() не падтрымліваецца гэтым пастаўшчыком экрана загрузкі.',
  'splashScreen.error.missingDependency':
    '`{{library}}` патрабуецца, але не ўсталяваны. Усталюйце яго з дапамогай: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Пастаўшчык не ўстаноўлены. Выклічце `setProvider()` з рэалізацыяй `SplashScreenProvider` (напрыклад, з `@molecule/app-splash-screen-react-native`).',
}
