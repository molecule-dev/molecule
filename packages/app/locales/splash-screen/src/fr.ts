import type { SplashScreenTranslations } from './types.js'

/** SplashScreen translations for fr. */
export const fr: Partial<SplashScreenTranslations> = {
  'splashScreen.error.noProvider': "Le fournisseur d'écran de démarrage n'est pas configuré.",
  'splashScreen.warn.configureNotSupported':
    "La fonction configure() n'est pas prise en charge par ce fournisseur d'écran de démarrage.",
  'splashScreen.error.missingDependency':
    "`{{library}}` est requise mais n'est pas installée. Installez-la avec : `npx expo install {{library}}`",
}
