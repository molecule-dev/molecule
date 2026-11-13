import type { PushTranslations } from './types.js'

/** Push translations for English. */
export const en: PushTranslations = {
  'push.error.notSupported': 'Push notifications not supported',
  'push.error.permissionNotGranted': 'Notification permission not granted',
  'push.error.missingDependency':
    '`{{library}}` is required but not installed. Install it with: `npx expo install {{library}}`',
}
