import type { PushTranslations } from './types.js'

/** Push translations for Romanian. */
export const ro: PushTranslations = {
  'push.error.notSupported': 'Notificările push nu sunt suportate',
  'push.error.permissionNotGranted': 'Permisiunea de notificare nu a fost acordată',
  'push.error.missingDependency':
    '`{{library}}` este obligatoriu, dar nu este instalat. Instalați-l cu: `npx expo install {{library}}`',
}
