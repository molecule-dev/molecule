import type { PushTranslations } from './types.js'

/** Push translations for Indonesian. */
export const id: PushTranslations = {
  'push.error.notSupported': 'Notifikasi push tidak didukung',
  'push.error.permissionNotGranted': 'Izin notifikasi tidak diberikan',
  'push.error.missingDependency':
    '`{{library}}` diperlukan tetapi belum terpasang. Pasang dengan: `npx expo install {{library}}`',
}
