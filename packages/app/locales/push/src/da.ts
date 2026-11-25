import type { PushTranslations } from './types.js'

/** Push translations for Danish. */
export const da: PushTranslations = {
  'push.error.notSupported': 'Push-notifikationer understøttes ikke',
  'push.error.permissionNotGranted': 'Notifikationstilladelse ikke givet',
  'push.error.missingDependency':
    '`{{library}}` er påkrævet, men ikke installeret. Installer det med: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Ingen service worker er registreret. Push-notifikationer kræver appens produktionsbuild med @molecule/app-pwa-default installeret.',
}
