import type { PushTranslations } from './types.js'

/** Push translations for Ukrainian. */
export const uk: PushTranslations = {
  'push.error.notSupported': 'Push-сповіщення не підтримуються',
  'push.error.permissionNotGranted': 'Дозвіл на сповіщення не надано',
  'push.error.missingDependency':
    "`{{library}}` обов'язковий, але не встановлений. Встановіть його за допомогою: `npx expo install {{library}}`",
}
