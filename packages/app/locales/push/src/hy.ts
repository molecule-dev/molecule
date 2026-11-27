import type { PushTranslations } from './types.js'

/** Push translations for Armenian. */
export const hy: PushTranslations = {
  'push.error.notSupported': 'Push tsanucumner chesupportavorvum en',
  'push.error.permissionNotGranted': 'Tsanucman tuyltvutyuny trvac che',
  'push.error.missingDependency':
    '`{{library}}` պարտադիր է, բայց տեղադրված չէ։ Տեղադրեք այն՝ `npx expo install {{library}}`-ով։',
  'push.error.noServiceWorker':
    'Ոչ մի service worker գրանցված չէ։ Push ծանուցումների համար անհրաժեշտ է հավելվածի արտադրական կառուցվածքը՝ տեղադրված @molecule/app-pwa-default-ով։',
}
