import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Czech. */
export const cs: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Poskytovatel úvodní obrazovky není nakonfigurován.',
  'splashScreen.warn.configureNotSupported':
    'configure() není podporováno tímto poskytovatelem úvodní obrazovky.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je povinná, ale není nainstalovaná. Nainstalujte ji pomocí: `npx expo install {{library}}`',
}
