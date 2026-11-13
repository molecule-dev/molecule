import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Kazakh. */
export const kk: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Бастапқы экран провайдері конфигурацияланбаған.',
  'splashScreen.warn.configureNotSupported':
    'configure() бұл бастапқы экран провайдерімен қолдау көрсетілмейді.',
  'splashScreen.error.missingDependency':
    '`{{library}}` қажет, бірақ орнатылмаған. Оны келесідей орнатыңыз: `npx expo install {{library}}`',
}
