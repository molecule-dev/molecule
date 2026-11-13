import type { SplashScreenTranslations } from './types.js'

/** SplashScreen translations for fr. */
export const fr: Partial<SplashScreenTranslations> = {
  'splashScreen.warn.configureNotSupported':
    "La fonction configure() n'est pas prise en charge par ce fournisseur d'écran de démarrage.",
  'splashScreen.error.missingDependency':
    "`{{library}}` est requise mais n'est pas installée. Installez-la avec : `npx expo install {{library}}`",
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Aucun fournisseur défini. Appelez `setProvider()` avec une implémentation `SplashScreenProvider` (par exemple, depuis `@molecule/app-splash-screen-react-native`).',
}
