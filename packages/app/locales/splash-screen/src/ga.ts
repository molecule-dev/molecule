import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Irish. */
export const ga: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'Níl soláthraí an scáileáin tosaigh cumraithe.',
  'splashScreen.warn.configureNotSupported':
    'Ní thacaítear le configure() ag an soláthraí scáileáin tosaigh seo.',
  'splashScreen.error.missingDependency':
    'Tá `{{library}}` riachtanach ach níl sé suiteáilte. Suiteáil é le: `npx expo install {{library}}`',
}
