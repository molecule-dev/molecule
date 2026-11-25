import type { PushTranslations } from './types.js'

/** Push translations for Mongolian. */
export const mn: PushTranslations = {
  'push.error.notSupported': 'Пуш мэдэгдэл дэмжигдэхгүй',
  'push.error.permissionNotGranted': 'Мэдэгдлийн зөвшөөрөл олгогдоогүй',
  'push.error.missingDependency':
    '`{{library}}` шаардлагатай боловч суулгаагүй байна. Үүнийг дараах байдлаар суулгана уу: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Ямар ч service worker бүртгэгдээгүй байна. Push мэдэгдэлд @molecule/app-pwa-default суулгасан аппын үйлдвэрлэлийн хувилбар шаардлагатай.',
}
