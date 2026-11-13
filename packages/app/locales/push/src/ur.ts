import type { PushTranslations } from './types.js'

/** Push translations for Urdu. */
export const ur: PushTranslations = {
  'push.error.notSupported': 'پش اطلاعات معاون نہیں ہیں',
  'push.error.permissionNotGranted': 'اطلاع کی اجازت نہیں دی گئی',
  'push.error.missingDependency':
    '`{{library}}` درکار ہے لیکن انسٹال نہیں ہے۔ اسے اس کے ساتھ انسٹال کریں: `npx expo install {{library}}`',
}
