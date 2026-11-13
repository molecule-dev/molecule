import type { PushTranslations } from './types.js'

/** Push translations for Italian. */
export const it: PushTranslations = {
  'push.error.notSupported': 'Le notifiche push non sono supportate',
  'push.error.permissionNotGranted': 'Permesso di notifica non concesso',
  'push.error.missingDependency':
    '`{{library}}` è richiesto ma non installato. Installalo con: `npx expo install {{library}}`',
}
