import type { PushTranslations } from './types.js'

/** Push translations for Persian. */
export const fa: PushTranslations = {
  'push.error.notSupported': 'اعلان‌های فشاری پشتیبانی نمی‌شوند',
  'push.error.permissionNotGranted': 'مجوز اعلان داده نشده',
  'push.error.missingDependency':
    '`{{library}}` مورد نیاز است اما نصب نشده است. آن را با دستور زیر نصب کنید: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'هیچ service worker ثبت نشده است. اعلان‌های push به نسخه production برنامه با @molecule/app-pwa-default نصب‌شده نیاز دارند.',
}
