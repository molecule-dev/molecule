import type { PushTranslations } from './types.js'

/** Push translations for Norwegian Bokmål. */
export const nb: PushTranslations = {
  'push.error.notSupported': 'Push-varsler støttes ikke',
  'push.error.permissionNotGranted': 'Varslingstillatelse ikke gitt',
  'push.error.missingDependency':
    '`{{library}}` er nødvendig, men ikke installert. Installer det med: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Ingen service worker er registrert. Push-varsler krever produksjonsbygget av appen med @molecule/app-pwa-default installert.',
}
