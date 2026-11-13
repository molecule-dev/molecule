import type { PushTranslations } from './types.js'

/** Push translations for Welsh. */
export const cy: PushTranslations = {
  'push.error.notSupported': 'Nid yw hysbysiadau gwthio yn cael eu cefnogi',
  'push.error.permissionNotGranted': 'Caniatâd hysbysiad heb ei roi',
  'push.error.missingDependency':
    "Mae angen `{{library}}` ond nid yw wedi'i osod. Gosodwch ef gyda: `npx expo install {{library}}`",
}
