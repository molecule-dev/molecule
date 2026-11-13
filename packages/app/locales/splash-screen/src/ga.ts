import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Irish. */
export const ga: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'Ní thacaítear le configure() ag an soláthraí scáileáin tosaigh seo.',
  'splashScreen.error.missingDependency':
    'Tá `{{library}}` riachtanach ach níl sé suiteáilte. Suiteáil é le: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: Níl aon soláthraí socraithe. Glaoigh ar `setProvider()` le cur i bhfeidhm `SplashScreenProvider` (m.sh., ó `@molecule/app-splash-screen-react-native`).',
}
