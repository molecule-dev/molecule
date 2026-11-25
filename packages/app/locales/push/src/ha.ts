import type { PushTranslations } from './types.js'

/** Push translations for Hausa. */
export const ha: PushTranslations = {
  'push.error.notSupported': 'Ba a goyan bayan sanarwar turawa ba',
  'push.error.permissionNotGranted': 'Ba a ba da izinin sanarwa ba',
  'push.error.missingDependency':
    'Ana buƙatar `{{library}}` amma ba a shigar da shi ba. Shigar da shi da: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Babu service worker da aka yi rajista. Sanarwar tura tana buƙatar ginin samarwa na manhajar tare da shigar da @molecule/app-pwa-default.',
}
