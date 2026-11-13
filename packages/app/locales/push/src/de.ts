import type { PushTranslations } from './types.js'

/** Push translations for German. */
export const de: PushTranslations = {
  'push.error.notSupported': 'Push-Benachrichtigungen werden nicht unterstützt',
  'push.error.permissionNotGranted': 'Benachrichtigungsberechtigung nicht erteilt',
  'push.error.missingDependency':
    '`{{library}}` wird benötigt, ist aber nicht installiert. Installieren Sie sie mit: `npx expo install {{library}}`',
}
