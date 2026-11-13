import type { PushTranslations } from './types.js'

/** Push translations for Slovenian. */
export const sl: PushTranslations = {
  'push.error.notSupported': 'Potisna obvestila niso podprta',
  'push.error.permissionNotGranted': 'Dovoljenje za obvestila ni odobreno',
  'push.error.missingDependency':
    '`{{library}}` je obvezna, vendar ni nameščena. Namestite jo z: `npx expo install {{library}}`',
}
