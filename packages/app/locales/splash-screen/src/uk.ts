import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Ukrainian. */
export const uk: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() не підтримується цим провайдером екрана завантаження.',
  'splashScreen.error.missingDependency':
    "`{{library}}` обов'язковий, але не встановлений. Встановіть його за допомогою: `npx expo install {{library}}`",
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Постачальника не встановлено. Викличте `setProvider()` з реалізацією `SplashScreenProvider` (наприклад, з `@molecule/app-splash-screen-react-native`).',
}
