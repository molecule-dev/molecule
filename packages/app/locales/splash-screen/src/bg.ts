import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Bulgarian. */
export const bg: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Доставчикът на начален екран не е конфигуриран.',
  'splashScreen.warn.configureNotSupported':
    'configure() не се поддържа от този доставчик на начален екран.',
  'splashScreen.error.missingDependency':
    '`{{library}}` е задължителна, но не е инсталирана. Инсталирайте я с: `npx expo install {{library}}`',
}
