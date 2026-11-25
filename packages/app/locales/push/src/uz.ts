import type { PushTranslations } from './types.js'

/** Push translations for uz. */
export const uz: Partial<PushTranslations> = {
  'push.error.permissionNotGranted': 'Bildirishnoma ruxsati berilmagan',
  'push.error.notSupported': "Push-bildirishnomalar qo'llab-quvvatlanmaydi",
  'push.error.missingDependency':
    "`{{library}}` talab qilinadi, lekin o'rnatilmagan. Uni quyidagi bilan o'rnating: `npx expo install {{library}}`",
  'push.error.noServiceWorker':
    "Hech qanday service worker ro'yxatdan o'tmagan. Push bildirishnomalari uchun @molecule/app-pwa-default o'rnatilgan ilovaning ishlab chiqarish yig'masi kerak.",
}
