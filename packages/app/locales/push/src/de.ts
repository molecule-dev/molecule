import type { PushTranslations } from './types.js'

/** Push translations for German. */
export const de: PushTranslations = {
  'push.error.notSupported': 'Push-Benachrichtigungen werden nicht unterstützt',
  'push.error.permissionNotGranted': 'Benachrichtigungsberechtigung nicht erteilt',
  'push.error.missingDependency':
    '`{{library}}` wird benötigt, ist aber nicht installiert. Installieren Sie sie mit: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Es ist kein Service Worker registriert. Push-Benachrichtigungen benötigen den Produktions-Build der App mit installiertem @molecule/app-pwa-default.',
}
