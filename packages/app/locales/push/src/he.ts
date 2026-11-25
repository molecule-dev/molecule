import type { PushTranslations } from './types.js'

/** Push translations for Hebrew. */
export const he: PushTranslations = {
  'push.error.notSupported': 'התראות דחיפה אינן נתמכות',
  'push.error.permissionNotGranted': 'הרשאת התראות לא ניתנה',
  'push.error.missingDependency':
    '`{{library}}` נדרש אך אינו מותקן. התקן אותו באמצעות: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'לא רשום service worker. התראות פוש דורשות את גרסת הייצור של האפליקציה עם @molecule/app-pwa-default מותקן.',
}
