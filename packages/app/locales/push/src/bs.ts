import type { PushTranslations } from './types.js'

/** Push translations for Bosnian. */
export const bs: PushTranslations = {
  'push.error.notSupported': 'Push obavještenja nisu podržana',
  'push.error.permissionNotGranted': 'Dozvola za obavještenja nije odobrena',
  'push.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga sa: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Nijedan service worker nije registrovan. Push obavještenja zahtijevaju produkcijski build aplikacije s instaliranim @molecule/app-pwa-default.',
}
