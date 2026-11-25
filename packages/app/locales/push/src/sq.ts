import type { PushTranslations } from './types.js'

/** Push translations for Albanian. */
export const sq: PushTranslations = {
  'push.error.notSupported': 'Njoftimet push nuk mbeshteten',
  'push.error.permissionNotGranted': 'Leja e njoftimeve nuk eshte dhene',
  'push.error.missingDependency':
    '`{{library}}` është e detyrueshme, por nuk është instaluar. Instalojeni me: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Nuk është regjistruar asnjë service worker. Njoftimet push kërkojnë versionin e prodhimit të aplikacionit me @molecule/app-pwa-default të instaluar.',
}
