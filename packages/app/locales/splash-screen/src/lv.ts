import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Latvian. */
export const lv: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Sākuma ekrāna nodrošinātājs nav konfigurēts.',
  'splashScreen.warn.configureNotSupported':
    'configure() netiek atbalstīts šajā sākuma ekrāna nodrošinātājā.',
  'splashScreen.error.missingDependency':
    '`{{library}}` ir nepieciešama, bet nav instalēta. Instalējiet to, izmantojot: `npx expo install {{library}}`',
}
