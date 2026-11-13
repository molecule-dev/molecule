import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Russian. */
export const ru: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() не поддерживается этим провайдером экрана загрузки.',
  'splashScreen.error.missingDependency':
    '`{{library}}` необходима, но не установлена. Установите её с помощью команды: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Провайдер не установлен. Вызовите `setProvider()` с реализацией `SplashScreenProvider` (например, из `@molecule/app-splash-screen-react-native`).',
}
