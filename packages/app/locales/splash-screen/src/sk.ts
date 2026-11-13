import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Slovak. */
export const sk: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() nie je podporované týmto poskytovateľom úvodnej obrazovky.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je povinný, ale nie je nainštalovaný. Nainštalujte ho pomocou: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Žiadny nastavený poskytovateľ. Zavolajte `setProvider()` s implementáciou `SplashScreenProvider` (napr. z `@molecule/app-splash-screen-react-native`).',
}
