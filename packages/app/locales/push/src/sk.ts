import type { PushTranslations } from './types.js'

/** Push translations for Slovak. */
export const sk: PushTranslations = {
  'push.error.notSupported': 'Push oznámenia nie sú podporované',
  'push.error.permissionNotGranted': 'Oprávnenie pre oznámenia nebolo udelené',
  'push.error.missingDependency':
    '`{{library}}` je povinný, ale nie je nainštalovaný. Nainštalujte ho pomocou: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Nie je zaregistrovaný žiadny service worker. Push upozornenia vyžadujú produkčné zostavenie aplikácie s nainštalovaným @molecule/app-pwa-default.',
}
