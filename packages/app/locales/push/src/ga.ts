import type { PushTranslations } from './types.js'

/** Push translations for Irish. */
export const ga: PushTranslations = {
  'push.error.notSupported': 'Níl fógraí brúigh tacaithe',
  'push.error.permissionNotGranted': 'Níor deonaíodh cead fógra',
  'push.error.missingDependency':
    'Tá `{{library}}` riachtanach ach níl sé suiteáilte. Suiteáil é le: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Níl aon service worker cláraithe. Teastaíonn leagan táirgthe na haipe le @molecule/app-pwa-default suiteáilte ó fhógraí brú.',
}
