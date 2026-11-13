import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Swedish. */
export const sv: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Startskärmsleverantören är inte konfigurerad.',
  'splashScreen.warn.configureNotSupported':
    'configure() stöds inte av denna startskärmsleverantör.',
  'splashScreen.error.missingDependency':
    '`{{library}}` krävs men är inte installerat. Installera det med: `npx expo install {{library}}`',
}
