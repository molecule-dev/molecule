import type { PushTranslations } from './types.js'

/** Push translations for uz. */
export const uz: Partial<PushTranslations> = {
  'push.error.permissionNotGranted': 'Bildirishnoma ruxsati berilmagan',
  'push.error.notSupported': "Push-bildirishnomalar qo'llab-quvvatlanmaydi",
  'push.error.missingDependency':
    "`{{library}}` talab qilinadi, lekin o'rnatilmagan. Uni quyidagi bilan o'rnating: `npx expo install {{library}}`",
}
