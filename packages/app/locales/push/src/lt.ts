import type { PushTranslations } from './types.js'

/** Push translations for Lithuanian. */
export const lt: PushTranslations = {
  'push.error.notSupported': 'Push pranešimai nepalaikomi',
  'push.error.permissionNotGranted': 'Pranešimų leidimas nesuteiktas',
  'push.error.missingDependency':
    '`{{library}}` yra būtina, bet neįdiegta. Įdiekite ją naudodami: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Neužregistruotas joks service worker. Tiesioginiams pranešimams reikia programos gamybinės versijos su įdiegtu @molecule/app-pwa-default.',
}
