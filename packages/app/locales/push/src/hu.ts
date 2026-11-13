import type { PushTranslations } from './types.js'

/** Push translations for Hungarian. */
export const hu: PushTranslations = {
  'push.error.notSupported': 'A push értesítések nem támogatottak',
  'push.error.permissionNotGranted': 'Az értesítési engedély nem került megadásra',
  'push.error.missingDependency':
    '`{{library}}` kötelező, de nincs telepítve. Telepítse a következő paranccsal: `npx expo install {{library}}`',
}
