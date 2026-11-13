import type { PushTranslations } from './types.js'

/** Push translations for Arabic. */
export const ar: PushTranslations = {
  'push.error.notSupported': 'الإشعارات الفورية غير مدعومة',
  'push.error.permissionNotGranted': 'لم يتم منح إذن الإشعارات',
  'push.error.missingDependency':
    '`{{library}}` مطلوبة ولكنها غير مثبتة. قم بتثبيتها باستخدام الأمر التالي: `npx expo install {{library}}`',
}
