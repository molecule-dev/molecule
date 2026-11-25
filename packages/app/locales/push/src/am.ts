import type { PushTranslations } from './types.js'

/** Push translations for Amharic. */
export const am: PushTranslations = {
  'push.error.notSupported': 'የማሳወቂያ ግፊት አይደገፍም',
  'push.error.permissionNotGranted': 'የማሳወቂያ ፈቃድ አልተሰጠም',
  'push.error.missingDependency':
    '`{{library}}` ያስፈልጋል ግን አልተጫነም። በሚከተለው ይጫኑት፦ `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'ምንም service worker አልተመዘገበም። የግፋ ማሳወቂያዎች @molecule/app-pwa-default የተጫነበት የመተግበሪያውን የምርት ግንባታ ይፈልጋሉ።',
}
