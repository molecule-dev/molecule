import type { PushTranslations } from './types.js'

/** Push translations for Swahili. */
export const sw: PushTranslations = {
  'push.error.notSupported': 'Arifa za kushinikiza hazitumiki',
  'push.error.permissionNotGranted': 'Ruhusa ya arifa haijatolewa',
  'push.error.missingDependency':
    '`{{library}}` inahitajika lakini haijasakinishwa. Isakinishe na: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Hakuna service worker iliyosajiliwa. Arifa za push zinahitaji toleo la uzalishaji la programu lenye @molecule/app-pwa-default iliyosakinishwa.',
}
