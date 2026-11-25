import type { PushTranslations } from './types.js'

/** Push translations for French. */
export const fr: PushTranslations = {
  'push.error.notSupported': 'Les notifications push ne sont pas prises en charge',
  'push.error.permissionNotGranted': 'Permission de notification non accordée',
  'push.error.missingDependency':
    "`{{library}}` est requise mais n'est pas installée. Installez-la avec : `npx expo install {{library}}`",
  'push.error.noServiceWorker':
    "Aucun service worker n'est enregistré. Les notifications push nécessitent la version de production de l'application avec @molecule/app-pwa-default installé.",
}
