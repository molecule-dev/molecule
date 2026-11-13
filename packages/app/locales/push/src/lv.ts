import type { PushTranslations } from './types.js'

/** Push translations for Latvian. */
export const lv: PushTranslations = {
  'push.error.notSupported': 'Push paziņojumi nav atbalstīti',
  'push.error.permissionNotGranted': 'Paziņojumu atļauja nav piešķirta',
  'push.error.missingDependency':
    '`{{library}}` ir nepieciešama, bet nav instalēta. Instalējiet to, izmantojot: `npx expo install {{library}}`',
}
