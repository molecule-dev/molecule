import type { PushTranslations } from './types.js'

/** Push translations for Romanian. */
export const ro: PushTranslations = {
  'push.error.notSupported': 'Notificările push nu sunt suportate',
  'push.error.permissionNotGranted': 'Permisiunea de notificare nu a fost acordată',
  'push.error.missingDependency':
    '`{{library}}` este obligatoriu, dar nu este instalat. Instalați-l cu: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Niciun service worker nu este înregistrat. Notificările push necesită versiunea de producție a aplicației cu @molecule/app-pwa-default instalat.',
}
