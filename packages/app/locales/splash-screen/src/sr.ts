import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Serbian. */
export const sr: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Провајдер почетног екрана није конфигурисан.',
  'splashScreen.warn.configureNotSupported':
    'configure() није подржан овим провајдером почетног екрана.',
  'splashScreen.error.missingDependency':
    '`{{library}}` је потребан, али није инсталиран. Инсталирајте га помоћу: `npx expo install {{library}}`',
}
