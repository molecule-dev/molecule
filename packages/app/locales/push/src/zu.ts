import type { PushTranslations } from './types.js'

/** Push translations for Zulu. */
export const zu: PushTranslations = {
  'push.error.notSupported': 'Izaziso zokuphusha azisekelwe',
  'push.error.permissionNotGranted': 'Imvume yesaziso ayinikezwanga',
  'push.error.missingDependency':
    '`{{library}}` iyadingeka kodwa ayifakiwe. Faka nge: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Ayikho i-service worker ebhalisiwe. Izaziso ze-push zidinga ukwakhiwa kokukhiqiza kohlelo lokusebenza olufakwe i-@molecule/app-pwa-default.',
}
