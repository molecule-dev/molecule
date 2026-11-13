import type { PushTranslations } from './types.js'

/** Push translations for Thai. */
export const th: PushTranslations = {
  'push.error.notSupported': 'ไม่รองรับการแจ้งเตือนแบบพุช',
  'push.error.permissionNotGranted': 'ไม่ได้ให้สิทธิ์การแจ้งเตือน',
  'push.error.missingDependency':
    '`{{library}}` เป็นสิ่งที่จำเป็น แต่ยังไม่ได้ติดตั้ง ติดตั้งโดยใช้คำสั่ง: `npx expo install {{library}}`',
}
