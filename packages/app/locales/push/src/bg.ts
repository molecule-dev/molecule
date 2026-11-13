import type { PushTranslations } from './types.js'

/** Push translations for Bulgarian. */
export const bg: PushTranslations = {
  'push.error.notSupported': 'Пуш известията не се поддържат',
  'push.error.permissionNotGranted': 'Разрешението за известия не е предоставено',
  'push.error.missingDependency':
    '`{{library}}` е задължителна, но не е инсталирана. Инсталирайте я с: `npx expo install {{library}}`',
}
