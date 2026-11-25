import type { PushTranslations } from './types.js'

/** Push translations for Macedonian. */
export const mk: PushTranslations = {
  'push.error.notSupported': 'Пуш известувањата не се поддржани',
  'push.error.permissionNotGranted': 'Дозволата за известувања не е одобрена',
  'push.error.missingDependency':
    '`{{library}}` е задолжително, но не е инсталирано. Инсталирајте го со: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Нема регистриран service worker. Push известувањата бараат продукциска верзија на апликацијата со инсталиран @molecule/app-pwa-default.',
}
