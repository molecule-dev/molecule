import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Czech. */
export const cs: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() není podporováno tímto poskytovatelem úvodní obrazovky.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je povinná, ale není nainstalovaná. Nainstalujte ji pomocí: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Není nastaven žádný poskytovatel. Zavolejte `setProvider()` s implementací `SplashScreenProvider` (např. z `@molecule/app-splash-screen-react-native`).',
}
