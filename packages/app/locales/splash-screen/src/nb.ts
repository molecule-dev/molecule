import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Norwegian Bokmål. */
export const nb: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Oppstartsskjerm-leverandøren er ikke konfigurert.',
  'splashScreen.warn.configureNotSupported':
    'configure() støttes ikke av denne oppstartsskjerm-leverandøren.',
  'splashScreen.error.missingDependency':
    '`{{library}}` er nødvendig, men ikke installert. Installer det med: `npx expo install {{library}}`',
}
