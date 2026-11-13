import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Portuguese. */
export const pt: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() não é suportado por este fornecedor de ecrã de arranque.',
  'splashScreen.error.missingDependency':
    'A `{{library}}` é necessária, mas não está instalada. Instale-a com: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Nenhum provedor definido. Chame `setProvider()` com uma implementação de `SplashScreenProvider` (por exemplo, de `@molecule/app-splash-screen-react-native`).',
}
