import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Georgian. */
export const ka: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Dasatskisi ekranis provaideri ar aris konfigurirebuli.',
  'splashScreen.warn.configureNotSupported':
    'configure() ar aris mkhardalchebuli am dasatskisi ekranis provaideriT.',
  'splashScreen.error.missingDependency':
    '`{{library}}` აუცილებელია, მაგრამ არ არის დაინსტალირებული. დააინსტალირეთ ის: `npx expo install {{library}}` ით',
}
