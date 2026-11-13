import type { PushTranslations } from './types.js'

/** Push translations for Turkish. */
export const tr: PushTranslations = {
  'push.error.notSupported': 'Push bildirimleri desteklenmiyor',
  'push.error.permissionNotGranted': 'Bildirim izni verilmedi',
  'push.error.missingDependency':
    '`{{library}}` kütüphanesi gereklidir ancak yüklü değil. Şu komutla yükleyin: `npx expo install {{library}}`',
}
