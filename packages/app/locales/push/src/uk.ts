import type { PushTranslations } from './types.js'

/** Push translations for Ukrainian. */
export const uk: PushTranslations = {
  'push.error.notSupported': 'Push-сповіщення не підтримуються',
  'push.error.permissionNotGranted': 'Дозвіл на сповіщення не надано',
  'push.error.missingDependency':
    "`{{library}}` обов'язковий, але не встановлений. Встановіть його за допомогою: `npx expo install {{library}}`",
  'push.error.noServiceWorker':
    'Service worker не зареєстровано. Для push-сповіщень потрібна production-збірка застосунку зі встановленим @molecule/app-pwa-default.',
}
