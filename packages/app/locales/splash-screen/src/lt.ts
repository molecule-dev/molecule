import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Lithuanian. */
export const lt: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Pradinio ekrano teikėjas nėra sukonfigūruotas.',
  'splashScreen.warn.configureNotSupported':
    'configure() nėra palaikomas šio pradinio ekrano teikėjo.',
  'splashScreen.error.missingDependency':
    '`{{library}}` yra būtina, bet neįdiegta. Įdiekite ją naudodami: `npx expo install {{library}}`',
}
