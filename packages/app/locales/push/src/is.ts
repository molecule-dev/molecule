import type { PushTranslations } from './types.js'

/** Push translations for Icelandic. */
export const is: PushTranslations = {
  'push.error.notSupported': 'Ýtitilkynningar eru ekki studdar',
  'push.error.permissionNotGranted': 'Tilkynningaheimild ekki veitt',
  'push.error.missingDependency':
    '`{{library}}` er krafist en ekki uppsett. Setjið það upp með: `npx expo install {{library}}`',
}
