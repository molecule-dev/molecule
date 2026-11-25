import type { PushTranslations } from './types.js'

/** Push translations for Czech. */
export const cs: PushTranslations = {
  'push.error.notSupported': 'Push oznámení nejsou podporována',
  'push.error.permissionNotGranted': 'Oprávnění pro oznámení nebylo uděleno',
  'push.error.missingDependency':
    '`{{library}}` je povinná, ale není nainstalovaná. Nainstalujte ji pomocí: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Není zaregistrován žádný service worker. Push oznámení vyžadují produkční sestavení aplikace s nainstalovaným @molecule/app-pwa-default.',
}
