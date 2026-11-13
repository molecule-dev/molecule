import type { PushTranslations } from './types.js'

/** Push translations for Swedish. */
export const sv: PushTranslations = {
  'push.error.notSupported': 'Push-notiser stöds inte',
  'push.error.permissionNotGranted': 'Notisbehörighet inte beviljad',
  'push.error.missingDependency':
    '`{{library}}` krävs men är inte installerat. Installera det med: `npx expo install {{library}}`',
}
