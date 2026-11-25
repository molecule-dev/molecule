import type { PushTranslations } from './types.js'

/** Push translations for Basque. */
export const eu: PushTranslations = {
  'push.error.notSupported': 'Push jakinarazpenak ez dira bateragarriak',
  'push.error.permissionNotGranted': 'Jakinarazpen-baimena ez da eman',
  'push.error.missingDependency':
    '`{{library}}` beharrezkoa da baina ez dago instalatuta. Instalatu `npx expo install {{library}}` komandoarekin',
  'push.error.noServiceWorker':
    'Ez dago service worker-ik erregistratuta. Push jakinarazpenek aplikazioaren ekoizpen-konpilazioa behar dute, @molecule/app-pwa-default instalatuta.',
}
