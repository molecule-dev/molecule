import type { PushTranslations } from './types.js'

/** Push translations for Russian. */
export const ru: PushTranslations = {
  'push.error.notSupported': 'Push-уведомления не поддерживаются',
  'push.error.permissionNotGranted': 'Разрешение на уведомления не предоставлено',
  'push.error.missingDependency':
    '`{{library}}` необходима, но не установлена. Установите её с помощью команды: `npx expo install {{library}}`',
}
