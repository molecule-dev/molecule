import type { PushTranslations } from './types.js'

/** Push translations for Arabic. */
export const ar: PushTranslations = {
  'push.error.notSupported': 'الإشعارات الفورية غير مدعومة',
  'push.error.permissionNotGranted': 'لم يتم منح إذن الإشعارات',
  'push.error.missingDependency':
    '`{{library}}` مطلوبة ولكنها غير مثبتة. قم بتثبيتها باستخدام الأمر التالي: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'لم يتم تسجيل أي service worker. تحتاج إشعارات الدفع إلى إصدار الإنتاج من التطبيق مع تثبيت @molecule/app-pwa-default.',
}
