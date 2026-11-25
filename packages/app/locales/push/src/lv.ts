import type { PushTranslations } from './types.js'

/** Push translations for Latvian. */
export const lv: PushTranslations = {
  'push.error.notSupported': 'Push paziņojumi nav atbalstīti',
  'push.error.permissionNotGranted': 'Paziņojumu atļauja nav piešķirta',
  'push.error.missingDependency':
    '`{{library}}` ir nepieciešama, bet nav instalēta. Instalējiet to, izmantojot: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Nav reģistrēts neviens service worker. Push paziņojumiem nepieciešama lietotnes ražošanas versija ar instalētu @molecule/app-pwa-default.',
}
