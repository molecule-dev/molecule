import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Lithuanian. */
export const lt: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() nėra palaikomas šio pradinio ekrano teikėjo.',
  'splashScreen.error.missingDependency':
    '`{{library}}` yra būtina, bet neįdiegta. Įdiekite ją naudodami: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nenustatytas tiekėjas. Iškvieskite `setProvider()` su `SplashScreenProvider` įdiegimu (pvz., iš `@molecule/app-splash-screen-react-native`).',
}
