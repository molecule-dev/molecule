import type { PushTranslations } from './types.js'

/** Push translations for mt. */
export const mt: Partial<PushTranslations> = {
  'push.error.notSupported': 'Push notifications mhumiex supportati',
  'push.error.permissionNotGranted': "Permess ta' notifika mhux mogħti",
  'push.error.missingDependency':
    "`{{library}}` hija meħtieġa iżda mhux installata. Installaha b': `npx expo install {{library}}`",
  'push.error.noServiceWorker':
    "L-ebda service worker mhu rreġistrat. In-notifiki push jeħtieġu l-verżjoni tal-produzzjoni tal-app b'@molecule/app-pwa-default installat.",
}
