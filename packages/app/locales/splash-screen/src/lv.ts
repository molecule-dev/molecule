import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Latvian. */
export const lv: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() netiek atbalstīts šajā sākuma ekrāna nodrošinātājā.',
  'splashScreen.error.missingDependency':
    '`{{library}}` ir nepieciešama, bet nav instalēta. Instalējiet to, izmantojot: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nav iestatīts nodrošinātājs. Izsauciet `setProvider()` ar `SplashScreenProvider` ieviešanu (piemēram, no `@molecule/app-splash-screen-react-native`).',
}
