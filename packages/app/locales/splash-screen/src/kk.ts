import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Kazakh. */
export const kk: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() бұл бастапқы экран провайдерімен қолдау көрсетілмейді.',
  'splashScreen.error.missingDependency':
    '`{{library}}` қажет, бірақ орнатылмаған. Оны келесідей орнатыңыз: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Провайдер орнатылмаған. `setProvider()` функциясын `SplashScreenProvider` іске асыруымен шақырыңыз (мысалы, `@molecule/app-splash-screen-react-native` ішінен).',
}
