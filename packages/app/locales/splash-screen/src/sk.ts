import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Slovak. */
export const sk: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Poskytovateľ úvodnej obrazovky nie je nakonfigurovaný.',
  'splashScreen.warn.configureNotSupported':
    'configure() nie je podporované týmto poskytovateľom úvodnej obrazovky.',
  'splashScreen.error.missingDependency':
    '`{{library}}` je povinný, ale nie je nainštalovaný. Nainštalujte ho pomocou: `npx expo install {{library}}`',
}
